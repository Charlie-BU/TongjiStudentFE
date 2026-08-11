import { useEffect, useState } from "react";
import { EditOutlined, LoadingOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { tongjiStudentService } from "../../services/tongji-student";
import type { CreatedSession } from "../../hooks/use-chat";
import "./SessionSidebar.css";

const { Text, Title } = Typography;

type SessionSummary = CreatedSession;

type SessionSidebarProps = {
    createdSessions: SessionSummary[];
    isMobileOpen?: boolean;
    onNewChat: () => void;
    onSessionSelect: (sessionId: string) => void;
    selectedSessionId: string | null;
};

// SessionSidebar 展示当前用户最近活跃的持久会话。
export function SessionSidebar({
    createdSessions,
    isMobileOpen = false,
    onNewChat,
    onSessionSelect,
    selectedSessionId,
}: SessionSidebarProps) {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const displayedSessions = mergeSessions([...createdSessions, ...sessions]);

    useEffect(() => {
        let isActive = true;

        void tongjiStudentService
            .SessionGET({})
            .then((response) => {
                if (!isActive) {
                    return;
                }
                setSessions(getSessions(response));
            })
            .catch(() => {
                if (isActive) {
                    setSessions([]);
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    return (
        <aside
            className={`session-sidebar${
                isMobileOpen ? " session-sidebar-mobile-open" : ""
            }`}
            aria-label="会话列表"
        >
            <div className="session-sidebar-main">
                <Title className="session-sidebar-brand" level={3}>
                    同济同学 2.0
                </Title>
                <Button
                    aria-label="New Chat"
                    block
                    className="session-list-item session-new-chat-button"
                    icon={<EditOutlined style={{ fontSize: 14 }} />}
                    onClick={onNewChat}
                    type="text"
                >
                    <Text strong>New Chat</Text>
                </Button>

                <section
                    className="session-recents"
                    aria-labelledby="recents-title"
                >
                    <Text id="recents-title" type="secondary">
                        Recents
                    </Text>
                    <div className="session-list">
                        {isLoading ? (
                            <div
                                aria-label="正在加载会话"
                                className="session-list-loading"
                                role="status"
                            >
                                <LoadingOutlined />
                            </div>
                        ) : (
                            displayedSessions.map((session) => (
                                <Button
                                    block
                                    className={`session-list-item${
                                        session.id === selectedSessionId
                                            ? " session-list-item-selected"
                                            : ""
                                    }`}
                                    key={session.id}
                                    onClick={() => onSessionSelect(session.id)}
                                    title={session.name}
                                    type="text"
                                >
                                    <Text ellipsis strong>{session.name}</Text>
                                </Button>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <div className="session-sidebar-profile">
                <UserOutlined style={{ fontSize: 14 }} />
                <Text strong>User</Text>
            </div>
        </aside>
    );
}

function mergeSessions(sessions: SessionSummary[]): SessionSummary[] {
    const uniqueSessions = new Map<string, SessionSummary>();
    for (const session of sessions) {
        uniqueSessions.set(session.id, session);
    }

    return [...uniqueSessions.values()].sort(
        (left, right) =>
            getTimestamp(right.lastActiveAt) - getTimestamp(left.lastActiveAt),
    );
}

function getSessions(response: unknown): SessionSummary[] {
    const sessions =
        typeof response === "object" && response !== null
            ? (response as { sessions?: unknown }).sessions
            : undefined;

    if (!Array.isArray(sessions)) {
        return [];
    }

    return sessions.flatMap((session) => {
        if (typeof session !== "object" || session === null) {
            return [];
        }
        const value = session as Record<string, unknown>;
        if (typeof value.id !== "string") {
            return [];
        }
        return [
            {
                id: value.id,
                name:
                    typeof value.name === "string" && value.name.trim()
                        ? value.name
                        : "未命名会话",
                lastActiveAt:
                    typeof value.last_active_at === "string"
                        ? value.last_active_at
                        : "",
            },
        ];
    });
}

function getTimestamp(value: string): number {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
}
