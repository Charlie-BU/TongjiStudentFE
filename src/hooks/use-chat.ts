import { useCallback, useRef, useState } from "react";
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { tongjiStudentService } from "../services/tongji-student";
import { updateAnonymousSessionLastActiveAt } from "../utils/anonymous-session";

export type ChatActivity = {
    id: string;
    label: string;
    detail?: string;
    state: "running" | "completed";
    durationMs?: number;
};

export type ChatTurn = {
    id: string;
    question: string;
    answer: string;
    activities: ChatActivity[];
    reasoning: string;
    startedAt: number;
    durationMs?: number;
    error?: string;
    state: "streaming" | "completed" | "aborted" | "failed";
};

type ChatStreamEvent =
    | { type: "status"; label: string; detail?: string }
    | { type: "reasoning"; text: string }
    | { type: "tool_started"; id: string; label: string }
    | { type: "tool_completed"; id: string; label: string; durationMs?: number }
    | { type: "delta"; text: string }
    | { type: "completed"; durationMs?: number }
    | { type: "failed" };

type ServerEvent = {
    type: string;
    data?: unknown;
    seq?: number;
};

export type SessionSummary = {
    id: string;
    lastActiveAt: string;
    name: string;
};

type UseChatOptions = {
    isAnonymous?: boolean;
    onSessionCreated?: (
        session: SessionSummary,
        isAnonymous?: boolean,
    ) => void | Promise<void>;
    onSessionRestoreFailed?: () => void;
};

// useChat 收敛会话创建、SSE 消费、停止和聊天状态，页面组件仅负责渲染。
export function useChat({
    isAnonymous = false,
    onSessionCreated,
    onSessionRestoreFailed,
}: UseChatOptions = {}) {
    const [input, setInput] = useState("");
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const turnSequenceRef = useRef(0);
    const restoreSequenceRef = useRef(0);

    async function submitQuestion(value = input): Promise<void> {
        const question = value.trim();
        if (!question || isStreaming) {
            return;
        }

        turnSequenceRef.current += 1;
        const turnId = `turn-${turnSequenceRef.current}`;
        const startedAt = Date.now();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setInput("");
        setIsStreaming(true);
        setTurns((currentTurns) => [
            ...currentTurns,
            {
                id: turnId,
                question,
                answer: "",
                activities: [],
                reasoning: "",
                startedAt,
                state: "streaming",
            },
        ]);

        try {
            const sessionId = await getOrCreateSessionId(isAnonymous);

            let responseTextLength = 0;
            let sseBuffer = "";
            let lastSequence = 0;
            let receivedTerminalEvent = false;

            const consumeSseProgress = (progress: AxiosProgressEvent): void => {
                const responseText = getResponseText(progress);
                if (responseText === undefined) {
                    return;
                }

                const nextChunk = responseText.slice(responseTextLength);
                responseTextLength = responseText.length;
                sseBuffer += nextChunk;
                const frames = takeSseFrames(sseBuffer);
                sseBuffer = frames.remainder;

                for (const serverEvent of frames.events) {
                    if (
                        typeof serverEvent.seq === "number" &&
                        serverEvent.seq <= lastSequence
                    ) {
                        continue;
                    }
                    if (typeof serverEvent.seq === "number") {
                        lastSequence = serverEvent.seq;
                    }

                    const event = mapServerEvent(serverEvent);
                    if (!event) {
                        continue;
                    }
                    receivedTerminalEvent ||= isTerminalEvent(event);
                    setTurns((currentTurns) =>
                        currentTurns.map((turn) =>
                            updateTurn(turn, turnId, event),
                        ),
                    );
                }
            };

            await tongjiStudentService.SessionMessagesPOST(
                { message: question, session_id: sessionId },
                {
                    adapter: "xhr",
                    headers: { Accept: "text/event-stream" },
                    onDownloadProgress: consumeSseProgress,
                    responseType: "text",
                    signal: controller.signal,
                } satisfies AxiosRequestConfig,
            );

            if (!controller.signal.aborted && !receivedTerminalEvent) {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) =>
                        updateTurn(turn, turnId, { type: "completed" }),
                    ),
                );
            }
        } catch (error) {
            setTurns((currentTurns) =>
                currentTurns.map((turn) =>
                    turn.id === turnId
                        ? {
                              ...turn,
                              error:
                                  controller.signal.aborted ||
                                  isAbortError(error)
                                      ? undefined
                                      : "生成失败，请稍后重试。",
                              state:
                                  controller.signal.aborted ||
                                  isAbortError(error)
                                      ? "aborted"
                                      : "failed",
                          }
                        : turn,
                ),
            );
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    }

    const stopStreaming = useCallback((): void => {
        abortControllerRef.current?.abort();
    }, []);

    const startNewChat = useCallback((): void => {
        restoreSequenceRef.current += 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        sessionIdRef.current = null;
        setActiveSessionId(null);
        setInput("");
        setIsStreaming(false);
        setTurns([]);
    }, []);

    const restoreSession = useCallback(
        async (sessionId: string): Promise<void> => {
            const restoreSequence = restoreSequenceRef.current + 1;
            restoreSequenceRef.current = restoreSequence;
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            sessionIdRef.current = sessionId;
            setActiveSessionId(sessionId);
            setInput("");
            setIsStreaming(false);
            setTurns([]);

            try {
                const response = await tongjiStudentService.SessionMessagesGET({
                    limit: 100,
                    session_id: sessionId,
                });
                if (restoreSequenceRef.current !== restoreSequence) {
                    return;
                }

                const restoredTurns = restoreChatTurns(response);
                turnSequenceRef.current = restoredTurns.length;
                setTurns(restoredTurns);
            } catch {
                if (restoreSequenceRef.current === restoreSequence) {
                    setTurns([]);
                    onSessionRestoreFailed?.();
                }
            }
        },
        [onSessionRestoreFailed],
    );

    async function getOrCreateSessionId(
        isAnonymous: boolean = false,
    ): Promise<string> {
        // 当前在某个 session 中，直接返回 session_id
        if (sessionIdRef.current) {
            if (isAnonymous) {
                updateAnonymousSessionLastActiveAt(sessionIdRef.current);
            }
            return sessionIdRef.current;
        }
        // 欢迎页触发，创建新的 session
        const session = await tongjiStudentService.SessionPOST({});
        sessionIdRef.current = session.session_id;
        setActiveSessionId(session.session_id);
        await onSessionCreated?.(
            {
                id: session.session_id,
                lastActiveAt: new Date().toISOString(),
                name: "New Session",
            },
            isAnonymous,
        );
        // 匿名会话，更新当前会话的 lastActiveAt
        if (isAnonymous) {
            updateAnonymousSessionLastActiveAt(session.session_id);
        }
        return session.session_id;
    }

    return {
        activeSessionId,
        input,
        isStreaming,
        restoreSession,
        setInput,
        startNewChat,
        stopStreaming,
        submitQuestion,
        turns,
    };
}

export type ChatController = ReturnType<typeof useChat>;

export function takeSseFrames(input: string): {
    events: ServerEvent[];
    remainder: string;
} {
    const events: ServerEvent[] = [];
    let remainder = input;
    let separatorIndex = remainder.search(/\r?\n\r?\n/);

    while (separatorIndex >= 0) {
        const frame = remainder.slice(0, separatorIndex);
        const event = parseSseFrame(frame);
        if (event) {
            events.push(event);
        }
        remainder = remainder.slice(
            separatorIndex + (remainder[separatorIndex] === "\r" ? 4 : 2),
        );
        separatorIndex = remainder.search(/\r?\n\r?\n/);
    }

    return { events, remainder };
}

function parseSseFrame(frame: string): ServerEvent | null {
    const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

    if (!data || data === "[DONE]") {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(data);
        const event = toRecord(parsed);
        return typeof event.type === "string" ? (event as ServerEvent) : null;
    } catch {
        return null;
    }
}

function mapServerEvent(event: ServerEvent): ChatStreamEvent | null {
    const data = toRecord(event.data);

    switch (event.type) {
        case "agent.status":
            return {
                type: "status",
                label: readText(
                    data,
                    ["label", "message", "status"],
                    "正在处理",
                ),
                detail: readOptionalText(data, ["detail", "description"]),
            };
        case "assistant.reasoning":
            return {
                type: "reasoning",
                text: readText(data, ["text", "content", "reasoning_content"]),
            };
        case "assistant.delta":
            return {
                type: "delta",
                text: readText(data, ["text", "content", "delta"]),
            };
        case "tool.call.started":
            return {
                type: "tool_started",
                id: readText(data, ["id", "tool_call_id"], "tool"),
                label: readText(
                    data,
                    ["label", "name", "tool_name"],
                    "正在调用工具",
                ),
            };
        case "tool.call.completed":
            return {
                type: "tool_completed",
                id: readText(data, ["id", "tool_call_id"], "tool"),
                label: readText(
                    data,
                    ["label", "name", "tool_name"],
                    "工具调用完成",
                ),
                durationMs: readOptionalNumber(data, [
                    "duration_ms",
                    "durationMs",
                ]),
            };
        case "run.completed":
            return {
                type: "completed",
                durationMs: readOptionalNumber(data, [
                    "duration_ms",
                    "durationMs",
                ]),
            };
        case "run.failed":
            return { type: "failed" };
        default:
            return null;
    }
}

function updateTurn(
    turn: ChatTurn,
    turnId: string,
    event: ChatStreamEvent,
): ChatTurn {
    if (turn.id !== turnId) {
        return turn;
    }

    switch (event.type) {
        case "status":
            return {
                ...turn,
                activities: [
                    ...turn.activities.map((activity) =>
                        activity.state === "running"
                            ? { ...activity, state: "completed" as const }
                            : activity,
                    ),
                    {
                        id: `status-${turn.activities.length}`,
                        label: event.label,
                        detail: event.detail,
                        state: "running",
                    },
                ],
            };
        case "reasoning":
            return { ...turn, reasoning: event.text };
        case "tool_started":
            return {
                ...turn,
                activities: [
                    ...turn.activities.map((activity) =>
                        activity.state === "running"
                            ? { ...activity, state: "completed" as const }
                            : activity,
                    ),
                    { id: event.id, label: event.label, state: "running" },
                ],
            };
        case "tool_completed":
            return {
                ...turn,
                activities: turn.activities.map((activity) =>
                    activity.id === event.id
                        ? {
                              ...activity,
                              label: event.label,
                              durationMs: event.durationMs,
                              state: "completed",
                          }
                        : activity,
                ),
            };
        case "delta":
            return { ...turn, answer: turn.answer + event.text };
        case "completed":
            return {
                ...turn,
                activities: turn.activities.map((activity) => ({
                    ...activity,
                    state: "completed",
                })),
                durationMs:
                    event.durationMs ??
                    Math.max(0, Date.now() - turn.startedAt),
                state: "completed",
            };
        case "failed":
            return {
                ...turn,
                error: "生成失败，请稍后重试。",
                state: "failed",
            };
    }
}

function getResponseText(progress: AxiosProgressEvent): string | undefined {
    const nativeEvent = progress.event as unknown;
    if (typeof nativeEvent !== "object" || nativeEvent === null) {
        return undefined;
    }
    const target = (nativeEvent as { target?: unknown }).target;
    if (typeof target !== "object" || target === null) {
        return undefined;
    }
    const responseText = (target as { responseText?: unknown }).responseText;
    return typeof responseText === "string" ? responseText : undefined;
}

function isTerminalEvent(event: ChatStreamEvent): boolean {
    return event.type === "completed" || event.type === "failed";
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

function toRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
}

function readText(
    value: Record<string, unknown>,
    keys: string[],
    fallback = "",
): string {
    return readOptionalText(value, keys) ?? fallback;
}

function readOptionalText(
    value: Record<string, unknown>,
    keys: string[],
): string | undefined {
    for (const key of keys) {
        if (typeof value[key] === "string") {
            return value[key];
        }
    }
    return undefined;
}

function readOptionalNumber(
    value: Record<string, unknown>,
    keys: string[],
): number | undefined {
    for (const key of keys) {
        if (typeof value[key] === "number") {
            return value[key];
        }
    }
    return undefined;
}

function restoreChatTurns(response: unknown): ChatTurn[] {
    const messages = getMessages(response).sort(
        (left, right) => left.sequence - right.sequence,
    );
    const turnsByRunId = new Map<string, ChatTurn>();
    const runTimestamps = new Map<string, { first?: number; last?: number }>();
    const turns: ChatTurn[] = [];

    for (const message of messages) {
        const runId = message.runId || `history-${message.sequence}`;
        updateRunTimestamps(runTimestamps, runId, message.createdAt);
        let turn = turnsByRunId.get(runId);

        if (message.role === "user") {
            turn = {
                id: runId,
                question: message.content,
                answer: "",
                activities: [],
                reasoning: "",
                startedAt: message.createdAt ?? Date.now(),
                state: "completed",
            };
            turnsByRunId.set(runId, turn);
            turns.push(turn);
            continue;
        }

        if (!turn) {
            continue;
        }

        if (message.role === "assistant") {
            turn.answer += message.content;
            turn.reasoning ||= message.reasoning;
            for (const toolCall of message.toolCalls) {
                turn.activities.push({
                    id: toolCall.id,
                    label: toolCall.name,
                    state: "completed",
                });
            }
        } else if (message.role === "tool") {
            turn.activities.push({
                id: message.toolCallId || `tool-${message.sequence}`,
                label: message.toolName || "工具调用",
                state: "completed",
            });
        }
    }

    for (const turn of turns) {
        const timestamps = runTimestamps.get(turn.id);
        if (timestamps?.first !== undefined && timestamps.last !== undefined) {
            turn.durationMs = Math.max(0, timestamps.last - timestamps.first);
        }
    }

    return turns;
}

type HistoryMessage = {
    content: string;
    createdAt?: number;
    reasoning: string;
    role: string;
    runId: string;
    sequence: number;
    toolCallId: string;
    toolCalls: Array<{ id: string; name: string }>;
    toolName: string;
};

function getMessages(response: unknown): HistoryMessage[] {
    const messages =
        typeof response === "object" && response !== null
            ? (response as { messages?: unknown }).messages
            : undefined;

    if (!Array.isArray(messages)) {
        return [];
    }

    return messages.flatMap((message, index) => {
        if (typeof message !== "object" || message === null) {
            return [];
        }
        const value = message as Record<string, unknown>;
        return [
            {
                content: readText(value, ["content"]),
                createdAt: getTimestamp(readText(value, ["created_at"])),
                reasoning: readText(value, ["reasoning_content"]),
                role: readText(value, ["role"]),
                runId: readText(value, ["run_id"]),
                sequence:
                    typeof value.sequence === "number" ? value.sequence : index,
                toolCallId: readText(value, ["tool_call_id"]),
                toolCalls: getToolCalls(value.tool_calls),
                toolName: readText(value, ["tool_name"]),
            },
        ];
    });
}

function getToolCalls(value: unknown): Array<{ id: string; name: string }> {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((toolCall) => {
        if (typeof toolCall !== "object" || toolCall === null) {
            return [];
        }
        const tool = toolCall as Record<string, unknown>;
        const functionValue = toRecord(tool.function);
        return [
            {
                id: readText(tool, ["id"], "tool"),
                name: readText(functionValue, ["name"], "工具调用"),
            },
        ];
    });
}

function updateRunTimestamps(
    runTimestamps: Map<string, { first?: number; last?: number }>,
    runId: string,
    timestamp: number | undefined,
): void {
    if (timestamp === undefined) {
        return;
    }

    const current = runTimestamps.get(runId) ?? {};
    runTimestamps.set(runId, {
        first: current.first ?? timestamp,
        last: timestamp,
    });
}

function getTimestamp(value: string): number | undefined {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : timestamp;
}
