import { useEffect, useRef, useState } from "react";
import { Collapse, Typography } from "antd";
import { ChatInput } from "../chat-input/ChatInput";
import { streamMockReply, type StreamEvent } from "./mock-stream";
import "./ChatArea.css";

const { Paragraph, Text } = Typography;

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
    state: "streaming" | "completed" | "aborted";
};

// ChatArea 提供使用 Mock 数据演示的基础流式 Chatbot。
export function ChatArea() {
    const [input, setInput] = useState("");
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const conversationEndRef = useRef<HTMLDivElement | null>(null);
    const turnSequenceRef = useRef(0);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [turns]);

    // submitQuestion 启动一轮 Mock 流式回答。
    async function submitQuestion(value = input): Promise<void> {
        const question = value.trim();
        if (!question || isStreaming) {
            return;
        }

        turnSequenceRef.current += 1;
        const turnId = `turn-${turnSequenceRef.current}`;
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
                state: "streaming",
            },
        ]);

        try {
            for await (const event of streamMockReply(
                question,
                controller.signal,
            )) {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) => updateTurn(turn, turnId, event)),
                );
            }
        } catch (error) {
            if (isAbortError(error)) {
                setTurns((currentTurns) =>
                    currentTurns.map((turn) =>
                        turn.id === turnId
                            ? { ...turn, state: "aborted" }
                            : turn,
                    ),
                );
            }
        } finally {
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    }

    // stopStreaming 中止当前 Mock 流。
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
                                    turn={turn}
                                />
                                <div className="message assistant-message">
                                    {turn.answer ? (
                                        <Paragraph className="answer-text">
                                            {turn.answer}
                                        </Paragraph>
                                    ) : turn.state === "streaming" ? (
                                        <Text type="secondary">
                                            正在准备回答…
                                        </Text>
                                    ) : (
                                        <Text type="secondary">
                                            本轮回答已停止。
                                        </Text>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                    <div ref={conversationEndRef} />
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
function AgentActivity({ turn }: { turn: ChatTurn }) {
    const [isOpen, setIsOpen] = useState(turn.state === "streaming");

    if (turn.activities.length === 0 && !turn.reasoning) {
        return null;
    }

    const isStreaming = turn.state === "streaming";
    const activityContent = (
        <div className="activity-content">
            {turn.reasoning ? (
                <div className="reasoning-block">
                    <Text type="secondary">Agent 说明</Text>
                    <Paragraph>{turn.reasoning}</Paragraph>
                </div>
            ) : null}
            {turn.activities.map((activity) => (
                <div key={activity.id} className="activity-row">
                    <span
                        className={`activity-dot ${activity.state}`}
                        aria-hidden="true"
                    />
                    <div>
                        <Text>{activity.label}</Text>
                        {activity.detail ? (
                            <Text type="secondary">{activity.detail}</Text>
                        ) : null}
                        {activity.durationMs ? (
                            <Text type="secondary">
                                耗时 {activity.durationMs}ms
                            </Text>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <Collapse
            activeKey={isOpen ? ["activity"] : []}
            className="activity-collapse"
            ghost
            items={[
                {
                    key: "activity",
                    label: isStreaming ? "正在处理" : "查看工作过程",
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
    event: StreamEvent,
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
                state: "completed",
            };
    }
}

// isAbortError 判断流是否由用户主动停止。
function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}
