import { useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Collapse, Typography } from "antd";
import ReactMarkdown from "react-markdown";
import { useChat, type ChatTurn } from "../../hooks/use-chat";
import { ChatInput } from "../chat-input/ChatInput";
import "./ChatArea.css";

const { Text } = Typography;

// ChatArea 只负责会话展示，调用和状态由 useChat 管理。
export function ChatArea() {
    const { input, isStreaming, setInput, stopStreaming, submitQuestion, turns } =
        useChat();
    const conversationEndRef = useRef<HTMLDivElement | null>(null);
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

// formatWorkDuration 将毫秒耗时格式化为面向用户的秒或分钟。
function formatWorkDuration(durationMs: number): string {
    const seconds = Math.max(0, Math.floor(durationMs / 1000));
    return seconds >= 60 ? `${Math.floor(seconds / 60)} 分` : `${seconds} 秒`;
}
