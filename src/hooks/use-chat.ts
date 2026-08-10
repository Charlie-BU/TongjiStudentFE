import { useRef, useState } from "react";
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { tongjiStudentService } from "../services/tongji-student";

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

// useChat 收敛会话创建、SSE 消费、停止和聊天状态，页面组件仅负责渲染。
export function useChat() {
    const [input, setInput] = useState("");
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const turnSequenceRef = useRef(0);

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
            const sessionId = await getOrCreateSessionId();
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
                              error: controller.signal.aborted || isAbortError(error)
                                  ? undefined
                                  : "生成失败，请稍后重试。",
                              state:
                                  controller.signal.aborted || isAbortError(error)
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

    function stopStreaming(): void {
        abortControllerRef.current?.abort();
    }

    async function getOrCreateSessionId(): Promise<string> {
        if (sessionIdRef.current) {
            return sessionIdRef.current;
        }

        const session = await tongjiStudentService.SessionPOST({});
        sessionIdRef.current = session.session_id;
        return session.session_id;
    }

    return {
        input,
        isStreaming,
        setInput,
        stopStreaming,
        submitQuestion,
        turns,
    };
}

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
                label: readText(data, ["label", "message", "status"], "正在处理"),
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
                label: readText(data, ["label", "name", "tool_name"], "正在调用工具"),
            };
        case "tool.call.completed":
            return {
                type: "tool_completed",
                id: readText(data, ["id", "tool_call_id"], "tool"),
                label: readText(data, ["label", "name", "tool_name"], "工具调用完成"),
                durationMs: readOptionalNumber(data, ["duration_ms", "durationMs"]),
            };
        case "run.completed":
            return {
                type: "completed",
                durationMs: readOptionalNumber(data, ["duration_ms", "durationMs"]),
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
                    event.durationMs ?? Math.max(0, Date.now() - turn.startedAt),
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
