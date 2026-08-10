import { useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Collapse, Typography } from "antd";
import ReactMarkdown from "react-markdown";
import { tongjiStudentChatGateway } from "../../services/chat/tongji-student-chat-gateway";
import type {
    ChatGateway,
    ChatStreamEvent,
} from "../../services/chat/types";
import { ChatInput } from "../chat-input/ChatInput";
import "./ChatArea.css";

const { Text } = Typography;

// Activity 表示一轮对话中的 Agent 工作节点。
type Activity = {
    id: string;
    label: string;
    detail?: string;
    state: "running" | "completed";
    durationMs?: number;
};

// ChatTurn 表示一轮用户提问及其流式回答。
type ChatTurn = {
    id: string;
    question: string;
    answer: string;
    activities: Activity[];
    reasoning: string;
    startedAt: number;
    durationMs?: number;
    error?: string;
    state: "streaming" | "completed" | "aborted" | "failed";
};

type ChatAreaProps = {
    chatGateway?: ChatGateway;
};

// ChatArea 展示由 ChatGateway 驱动的流式 Chatbot。
export function ChatArea({
    chatGateway = tongjiStudentChatGateway,
}: ChatAreaProps) {
    const [input, setInput] = useState("");
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const conversationEndRef = useRef<HTMLDivElement | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const turnSequenceRef = useRef(0);
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    const activeTurnStartedAt = turns.find(
        (turn) => turn.state === "streaming",
    )?.startedAt;

    useEffect(() => {
        if (activeTurnStartedAt === undefined) {
            return;
        }

        const updateTime = (): void => setCurrentTime(Date.now());
        updateTime();
        const timer = window.setInterval(updateTime, 1000);

        return () => window.clearInterval(timer);
    }, [activeTurnStartedAt]);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [turns]);

    // submitQuestion 创建或复用会话，并消费本轮 SSE 事件。
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
            if (!sessionIdRef.current) {
                const session = await chatGateway.createSession();
                sessionIdRef.current = session.id;
            }

            for await (const event of chatGateway.streamMessage({
                sessionId: sessionIdRef.current,
                message: question,
                signal: controller.signal,
            })) {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) => updateTurn(turn, turnId, event)),
                );
            }
        } catch (error) {
            if (controller.signal.aborted || isAbortError(error)) {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) =>
                        turn.id === turnId
                            ? { ...turn, state: "aborted" }
                            : turn,
                        ),
                );
            } else {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) =>
                        turn.id === turnId
                            ? {
                                  ...turn,
                                  error: getErrorMessage(),
                                  state: "failed",
                              }
                            : turn,
                    ),
                );
            }
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    }

    // stopStreaming 中止当前服务端流。
    function stopStreaming(): void {
        abortControllerRef.current?.abort();
    }

    return (
        <main className="chat-shell tongji-student-theme">
            <section className="chat-main">
                <div className="conversation-list">
                    {turns.map((turn) => (
                        <article key={turn.id} className="chat-turn">
                            <div className="message user-message">
                                <Text>{turn.question}</Text>
                            </div>
                            <div className="assistant-section">
                                <AgentActivity
                                    key={`${turn.id}-${turn.state}`}
                                    elapsedMs={
                                        turn.durationMs ??
                                        (turn.state === "streaming"
                                            ? currentTime - turn.startedAt
                                            : undefined)
                                    }
                                    turn={turn}
                                />
                                <div className="message assistant-message">
                                    {turn.answer ? (
                                        <div className="markdown-content">
                                            <ReactMarkdown>
                                                {turn.answer}
                                            </ReactMarkdown>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    ))}
                    <div className="conversation-end" ref={conversationEndRef} />
                </div>
            </section>

            <ChatInput
                disabled={isStreaming}
                onChange={setInput}
                onStop={stopStreaming}
                onSubmit={() => void submitQuestion()}
                value={input}
            />
        </main>
    );
}

// AgentActivity 展示与最终 Assistant Message 分离的 Agent 工作过程。
function AgentActivity({
    elapsedMs,
    turn,
}: {
    elapsedMs?: number;
    turn: ChatTurn;
}) {
    const [isOpen, setIsOpen] = useState(turn.state === "streaming");
    const activityLabel =
        turn.error ??
        (!turn.answer && turn.state === "aborted"
              ? "本轮回答已停止。"
              : `已工作 ${formatWorkDuration(elapsedMs ?? 0)}`);

    if (turn.activities.length === 0 && !turn.reasoning && !turn.error) {
        return null;
    }

    const activityContent = (
        <div className="activity-content">
            {turn.reasoning ? (
                <div className="reasoning-block markdown-content">
                    <ReactMarkdown>{turn.reasoning}</ReactMarkdown>
                </div>
            ) : null}
            {turn.activities.map((activity) => {
                return (
                    <div key={activity.id} className="activity-row">
                        <SearchOutlined aria-hidden="true" />
                        <Text
                            type="secondary"
                            style={{ fontSize: 16, lineHeight: "24px" }}
                        >
                            {activity.label}
                            {activity.detail ? ` · ${activity.detail}` : ""}
                            {activity.durationMs
                                ? ` · 耗时 ${activity.durationMs}ms`
                                : ""}
                        </Text>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Collapse
            activeKey={isOpen ? ["activity"] : []}
            className={`activity-collapse${isOpen ? " activity-collapse-open" : ""}`}
            ghost
            styles={{
                body: { padding: "0 0" },
                header: {
                    color: "var(--ant-color-text-tertiary)",
                    fontSize: 16,
                    lineHeight: "24px",
                    padding: "0 0 8px",
                },
            }}
            items={[
                {
                    key: "activity",
                    label: activityLabel,
                    children: activityContent,
                },
            ]}
            onChange={(keys) => setIsOpen(keys.includes("activity"))}
        />
    );
}

// updateTurn 将单个流式事件投影为页面中的一轮对话状态。
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
                        state: "running" as const,
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
                    {
                        id: event.id,
                        label: event.label,
                        state: "running" as const,
                    },
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
                              state: "completed" as const,
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
                    state: "completed" as const,
                })),
                durationMs:
                    event.durationMs ?? Math.max(0, Date.now() - turn.startedAt),
                state: "completed",
            };
        case "failed":
            return {
                ...turn,
                // Gateway 实现可能携带诊断信息；UI 始终使用脱敏失败提示。
                error: getErrorMessage(),
                state: "failed",
            };
    }
}

// isAbortError 判断流是否由用户主动停止。
function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

// getErrorMessage 将传输层异常转换为不会泄漏服务端细节的页面提示。
function getErrorMessage(): string {
    return "生成失败，请稍后重试。";
}

// formatWorkDuration 将毫秒耗时格式化为面向用户的秒或分钟。
function formatWorkDuration(durationMs: number): string {
    const seconds = Math.max(0, Math.floor(durationMs / 1000));
    return seconds >= 60 ? `${Math.floor(seconds / 60)} 分` : `${seconds} 秒`;
}
