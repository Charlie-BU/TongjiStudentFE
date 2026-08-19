import { useEffect, useState } from "react";
import {
    EditOutlined,
    DeleteOutlined,
    EllipsisOutlined,
    LoadingOutlined,
    LogoutOutlined,
    SwapOutlined,
    UserOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import {
    Button,
    Dropdown,
    Image,
    Input,
    Modal,
    Tooltip,
    Typography,
    type MenuProps,
} from "antd";
import tongjiLogo from "../../assets/tongji.svg";
import { tongjiStudentService } from "../../services/tongji-student";
import "./SessionSidebar.css";
import type { UserBasicInfo200Response } from "../../cam-auto-generate/TongjiStudent/namespaces";
import type { SessionSummary } from "../../hooks/use-chat";
import {
    clearAnonymousSessions,
    getAnonymousSessions,
} from "../../utils/anonymous-session";

const { Text, Title } = Typography;

const TONGJI_OAUTH_AUTHORIZE_PATH = "/v1/tongji/oauth/authorize";
const LOGIN_REMINDER_SEEN_KEY = "tongji-login-reminder-seen";

type SessionSidebarProps = {
    createdSessions: SessionSummary[];
    isMobileOpen?: boolean;
    onNewChat: () => void;
    onSessionDeleted?: (sessionId: string) => void;
    onSessionSelect: (sessionId: string) => void;
    selectedSessionId: string | null;
    streamingSessionId?: string | null;
    userBasicInfo?: UserBasicInfo200Response | null;
    onOauthRedirect?: (url: string) => void;
    onPageReload?: () => void;
};

// SessionSidebar 展示当前用户最近活跃的持久会话。
export function SessionSidebar({
    createdSessions,
    isMobileOpen = false,
    onNewChat,
    onSessionDeleted = () => undefined,
    onSessionSelect,
    selectedSessionId,
    streamingSessionId = null,
    userBasicInfo = null,
    onOauthRedirect = (url) => window.location.assign(url),
    onPageReload = () => window.location.reload(),
}: SessionSidebarProps) {
    const [sessions, setSessions] =
        useState<SessionSummary[]>(getAnonymousSessions);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSession, setEditingSession] = useState<SessionSummary | null>(
        null,
    );
    const displayedSessions = mergeSessions([...createdSessions, ...sessions]);
    const isSessionListLoading = userBasicInfo !== null && isLoading;
    const isSessionSwitchDisabled = streamingSessionId !== null;
    const sessionSwitchDisabledMessage =
        "当前会话正在工作中，请等待完成后再切换";
    const startOauth = (): void => {
        clearAnonymousSessions(); // 清除匿名会话
        onOauthRedirect(getTongjiOauthAuthorizeUrl());
    };
    const logout = (): void => {
        window.localStorage.removeItem("tongji-access-token");
        window.sessionStorage.removeItem(LOGIN_REMINDER_SEEN_KEY);
        onPageReload();
    };
    const userMenuItems: MenuProps["items"] = [
        {
            icon: <SwapOutlined />,
            key: "switch-user",
            label: "切换用户",
            onClick: startOauth,
        },
        {
            danger: true,
            icon: <LogoutOutlined />,
            key: "logout",
            label: "退出登录",
            onClick: logout,
        },
    ];
    const renameSession = async (session: SessionSummary): Promise<void> => {
        const name =
            editingSession?.id === session.id
                ? editingSession.name.trim()
                : session.name;
        setEditingSession(null);
        if (!name || name === session.name) {
            return;
        }

        const renamedSession = await tongjiStudentService.SessionRenamePOST({
            name,
            session_id: session.id,
        });
        setSessions((currentSessions) => {
            const updatedSession = { ...session, name: renamedSession.name };
            const exists = currentSessions.some(
                (item) => item.id === session.id,
            );
            return exists
                ? currentSessions.map((item) =>
                      item.id === session.id ? updatedSession : item,
                  )
                : [...currentSessions, updatedSession];
        });
    };
    const deleteSession = (session: SessionSummary): void => {
        Modal.confirm({
            cancelText: "取消",
            content: `删除“${session.name}”后将无法恢复。`,
            okButtonProps: { danger: true },
            okText: "删除",
            onOk: async () => {
                await tongjiStudentService.SessionDeleteDELETE({
                    Authorization: "",
                    session_id: session.id,
                });
                setSessions((currentSessions) =>
                    currentSessions.filter((item) => item.id !== session.id),
                );
                onSessionDeleted(session.id);
                if (session.id === selectedSessionId) {
                    onNewChat();
                }
            },
            title: "确认删除会话？",
        });
    };

    useEffect(() => {
        if (!userBasicInfo) {
            return;
        }

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
    }, [userBasicInfo]);

    return (
        <aside
            className={`session-sidebar${
                isMobileOpen ? " session-sidebar-mobile-open" : ""
            }`}
            aria-label="会话列表"
        >
            <div className="session-sidebar-main">
                <Title className="session-sidebar-brand" level={3}>
                    <Image
                        alt="同济大学"
                        className="session-sidebar-brand-logo"
                        preview={false}
                        src={tongjiLogo}
                        width={30}
                        height={30}
                    />
                    同济同学 2.0
                </Title>
                <Tooltip
                    title={
                        isSessionSwitchDisabled
                            ? sessionSwitchDisabledMessage
                            : undefined
                    }
                >
                    <span className="session-new-chat-tooltip">
                        <Button
                            aria-label="New Chat"
                            block
                            className="session-list-item session-new-chat-button"
                            disabled={isSessionSwitchDisabled}
                            icon={<PlusOutlined style={{ fontSize: 14 }} />}
                            onClick={onNewChat}
                            type="text"
                        >
                            <Text strong>新会话</Text>
                        </Button>
                    </span>
                </Tooltip>

                <section
                    className="session-recents"
                    aria-labelledby="recents-title"
                >
                    {(isSessionListLoading || displayedSessions.length > 0) && (
                        <Text id="recents-title" type="secondary">
                            最近
                        </Text>
                    )}
                    <div className="session-list">
                        {isSessionListLoading ? (
                            <div
                                aria-label="正在加载会话"
                                className="session-list-loading"
                                role="status"
                            >
                                <LoadingOutlined />
                            </div>
                        ) : (
                            displayedSessions.map((session) => {
                                const isSelected =
                                    session.id === selectedSessionId;
                                const isSessionButtonDisabled =
                                    isSessionSwitchDisabled && !isSelected;
                                const menuItems = userBasicInfo
                                    ? [
                                          {
                                              icon: <EditOutlined />,
                                              key: "rename",
                                              label: "重命名",
                                              onClick: () =>
                                                  setEditingSession(session),
                                          },
                                          {
                                              disabled:
                                                  session.id ===
                                                  streamingSessionId,
                                              danger: true,
                                              icon: <DeleteOutlined />,
                                              key: "delete",
                                              label: "删除会话",
                                              onClick: () =>
                                                  deleteSession(session),
                                              title:
                                                  session.id ===
                                                  streamingSessionId
                                                      ? "正在工作中，请等待工作完成后删除"
                                                      : undefined,
                                          },
                                      ]
                                    : [];

                                return (
                                    <div
                                        className={`session-list-row${
                                            isSelected
                                                ? " session-list-row-selected"
                                                : ""
                                        }`}
                                        key={session.id}
                                    >
                                        {editingSession?.id === session.id ? (
                                            <Input
                                                id={session.id}
                                                aria-label={`重命名 ${session.name}`}
                                                autoFocus
                                                className="session-list-item-input"
                                                onBlur={() =>
                                                    void renameSession(session)
                                                }
                                                onChange={(event) =>
                                                    setEditingSession(
                                                        (current) =>
                                                            current?.id ===
                                                            session.id
                                                                ? {
                                                                      ...current,
                                                                      name: event
                                                                          .target
                                                                          .value,
                                                                  }
                                                                : current,
                                                    )
                                                }
                                                onPressEnter={(event) =>
                                                    event.currentTarget.blur()
                                                }
                                                value={editingSession.name}
                                            />
                                        ) : (
                                            <Tooltip
                                                title={
                                                    isSessionButtonDisabled
                                                        ? sessionSwitchDisabledMessage
                                                        : undefined
                                                }
                                            >
                                                <span className="session-list-item-tooltip">
                                                    <Button
                                                        block
                                                        className={`session-list-item${
                                                            isSelected
                                                                ? " session-list-item-selected"
                                                                : ""
                                                        }`}
                                                        disabled={isSessionButtonDisabled}
                                                        onClick={() =>
                                                            onSessionSelect(session.id)
                                                        }
                                                        title={session.name}
                                                        type="text"
                                                    >
                                                        <Text ellipsis strong>
                                                            {session.name}
                                                        </Text>
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        )}
                                        {userBasicInfo ? (
                                            <Dropdown
                                                menu={{ items: menuItems }}
                                                placement="bottomLeft"
                                                trigger={["click"]}
                                            >
                                                <Button
                                                    aria-label={`操作会话 ${session.name}`}
                                                    className="session-list-item-more"
                                                    icon={<EllipsisOutlined />}
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                    type="text"
                                                />
                                            </Dropdown>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <div className="session-sidebar-profile">
                {userBasicInfo ? (
                    <Dropdown
                        menu={{ items: userMenuItems }}
                        placement="topLeft"
                        trigger={["hover", "click"]}
                    >
                        <button
                            aria-label="用户菜单"
                            className="session-sidebar-profile-trigger"
                            type="button"
                        >
                            <UserOutlined style={{ fontSize: 14 }} />
                            <ProfileInfo userBasicInfo={userBasicInfo} />
                        </button>
                    </Dropdown>
                ) : (
                    <button
                        aria-label="同济统一身份认证登录"
                        className="session-sidebar-profile-trigger"
                        onClick={startOauth}
                        type="button"
                    >
                        <UserOutlined style={{ fontSize: 14 }} />
                        <ProfileInfo />
                    </button>
                )}
            </div>
        </aside>
    );
}

function getTongjiOauthAuthorizeUrl(): string {
    const baseURL = (
        import.meta.env.VITE_TONGJI_STUDENT_BASE_URL ?? ""
    ).replace(/\/+$/, "");
    return `${baseURL}${TONGJI_OAUTH_AUTHORIZE_PATH}`;
}

function ProfileInfo({
    userBasicInfo,
}: {
    userBasicInfo?: UserBasicInfo200Response;
}) {
    return (
        <span className="session-sidebar-profile-info">
            <Text className="session-sidebar-profile-name" strong>
                {userBasicInfo?.name ?? "同济统一身份认证"}
            </Text>
            {userBasicInfo ? (
                <Text className="session-sidebar-profile-meta" type="secondary">
                    {userBasicInfo.userId} · {userBasicInfo.userTypeName}
                </Text>
            ) : null}
        </span>
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
