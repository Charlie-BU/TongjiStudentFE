import {
    useCallback,
    useEffect,
    useState,
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
} from "react";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, theme, Watermark } from "antd";
import { SessionSidebar } from "./components/session-sidebar/SessionSidebar";
import { TestAccessTokenControl } from "./components/test-access-token/TestAccessTokenControl";
import { OauthCallback } from "./components/oauth-callback/OauthCallback";
import { ChatArea } from "./components/chat-area/ChatArea";
import { LoginReminderModal } from "./components/login-reminder-modal/LoginReminderModal";
import { WelcomePage } from "./components/welcome-page/WelcomePage";
import { type SessionSummary, useChat } from "./hooks/use-chat";
import { useSessionRoute } from "./hooks/use-session-route";
import { tongjiStudentService } from "./services/tongji-student";
import type { UserBasicInfo200Response } from "./cam-auto-generate/TongjiStudent/namespaces";
import { addAnonymousSession } from "./utils/anonymous-session";

const SIDEBAR_DEFAULT_WIDTH = 260;
const SIDEBAR_MIN_WIDTH = 224;
const SIDEBAR_MAX_WIDTH = 570;
const TONGJI_ACCESS_TOKEN_KEY = "tongji-access-token";
const TONGJI_OAUTH_AUTHORIZE_PATH = "/v1/tongji/oauth/authorize";
const LOGIN_REMINDER_SEEN_KEY = "tongji-login-reminder-seen";
const OAUTH_CALLBACK_PATH = `${import.meta.env.BASE_URL}oauth/callback`;

function App() {
    return window.location.pathname === OAUTH_CALLBACK_PATH ? (
        <OauthCallback />
    ) : (
        <ChatApp />
    );
}

function ThemeCssVariables() {
    const { token } = theme.useToken();

    useEffect(() => {
        const rootStyle = document.documentElement.style;
        const cssVars = {
            "--ant-border-radius": `${token.borderRadius}px`,
            "--ant-box-shadow-tertiary": token.boxShadowTertiary,
            "--ant-color-bg-container": token.colorBgContainer,
            "--ant-color-bg-container-disabled": token.colorBgContainerDisabled,
            "--ant-color-bg-layout": token.colorBgLayout,
            "--ant-color-border": token.colorBorder,
            "--ant-color-border-secondary": token.colorBorderSecondary,
            "--ant-color-fill": token.colorFill,
            "--ant-color-fill-quaternary": token.colorFillQuaternary,
            "--ant-color-fill-secondary": token.colorFillSecondary,
            "--ant-color-fill-tertiary": token.colorFillTertiary,
            "--ant-color-primary": token.colorPrimary,
            "--ant-color-text": token.colorText,
            "--ant-color-text-disabled": token.colorTextDisabled,
            "--ant-color-text-light-solid": token.colorTextLightSolid,
            "--ant-color-text-placeholder": token.colorTextPlaceholder,
            "--ant-color-text-secondary": token.colorTextSecondary,
            "--ant-color-text-tertiary": token.colorTextTertiary,
        } as const;

        Object.entries(cssVars).forEach(([name, value]) => {
            rootStyle.setProperty(name, value);
        });

        return () => {
            Object.keys(cssVars).forEach((name) => {
                rootStyle.removeProperty(name);
            });
        };
    }, [token]);

    return null;
}

function AppWatermark({
    children,
    content,
}: Readonly<{
    children: ReactNode;
    content: string;
}>) {
    const { token } = theme.useToken();

    return (
        <Watermark
            content={content}
            font={{ color: token.colorFillTertiary }}
        >
            {children}
        </Watermark>
    );
}

// ChatApp 负责常规页面的全局 antd 主题和聊天区域装配。
function ChatApp() {
    const { openNewChat, openSession, sessionId } = useSessionRoute();
    const [createdSessions, setCreatedSessions] = useState<SessionSummary[]>(
        [],
    );
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [userBasicInfo, setUserBasicInfo] =
        useState<UserBasicInfo200Response | null>(null);
    const [isUserInfoResolved, setIsUserInfoResolved] = useState(false);
    const [isLoginReminderOpen, setIsLoginReminderOpen] = useState(false);
    const handleSessionRestoreFailed = useCallback((): void => {
        openNewChat();
    }, [openNewChat]);

    // 创建 session 后
    const handleSessionCreated = useCallback(
        async (
            session: SessionSummary,
            isAnonymous: boolean = false,
        ): Promise<void> => {
            if (isAnonymous) {
                // 匿名会话需添加到 localStorage
                addAnonymousSession(session);
            }
            setCreatedSessions((currentSessions) => [
                session,
                ...currentSessions.filter(
                    (currentSession) => currentSession.id !== session.id,
                ),
            ]);
            openSession(session.id); // 页面跳转到当前 session
            await Promise.resolve();
        },
        [openSession],
    );

    const chat = useChat({
        isAnonymous: userBasicInfo === null,
        onSessionCreated: handleSessionCreated,
        onSessionRestoreFailed: handleSessionRestoreFailed,
    });

    const { restoreSession, startNewChat } = chat;
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
    const handleNewChat = useCallback((): void => {
        setIsMobileSidebarOpen(false);
        openNewChat();
    }, [openNewChat]);

    const handleSessionSelect = useCallback(
        (nextSessionId: string): void => {
            setIsMobileSidebarOpen(false);
            openSession(nextSessionId); // 页面跳转到当前 session
        },
        [openSession],
    );

    const handleSessionDeleted = useCallback(
        (deletedSessionId: string): void => {
            setCreatedSessions((currentSessions) =>
                currentSessions.filter(
                    (session) => session.id !== deletedSessionId,
                ),
            );
        },
        [],
    );

    useEffect(() => {
        if (sessionId) {
            if (chat.activeSessionId === sessionId) {
                return;
            }
            void restoreSession(sessionId);
            return;
        }

        startNewChat();
    }, [chat.activeSessionId, restoreSession, sessionId, startNewChat]);

    useEffect(() => {
        let isActive = true;
        const clearAccessToken = (): void => {
            window.localStorage.removeItem(TONGJI_ACCESS_TOKEN_KEY);
        };

        void tongjiStudentService
            .UserBasicInfoGET({})
            .then((user) => {
                if (!isActive) {
                    return;
                }

                if (user) {
                    setUserBasicInfo(user);
                    setIsUserInfoResolved(true);
                    return;
                }

                setUserBasicInfo(null);
                setIsUserInfoResolved(true);
            })
            .catch((error: unknown) => {
                if (isActive) {
                    if (
                        getResponseStatus(error) === 401 ||
                        getResponseStatus(error) === 502
                    ) {
                        clearAccessToken();
                    }
                    setUserBasicInfo(null);
                    setIsUserInfoResolved(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (
            !isUserInfoResolved ||
            userBasicInfo !== null ||
            window.sessionStorage.getItem(LOGIN_REMINDER_SEEN_KEY)
        ) {
            return;
        }

        window.sessionStorage.setItem(LOGIN_REMINDER_SEEN_KEY, "true");
        const openReminderTimer = window.setTimeout(
            () => setIsLoginReminderOpen(true),
            0,
        );
        return () => window.clearTimeout(openReminderTimer);
    }, [isUserInfoResolved, userBasicInfo]);

    const openLoginReminder = useCallback((): void => {
        setIsLoginReminderOpen(true);
    }, []);

    const startOauth = useCallback((): void => {
        const baseURL = (
            import.meta.env.VITE_TONGJI_STUDENT_BASE_URL ?? ""
        ).replace(/\/+$/, "");
        window.location.assign(`${baseURL}${TONGJI_OAUTH_AUTHORIZE_PATH}`);
    }, []);

    useEffect(() => {
        const constrainSidebarWidth = (): void => {
            setSidebarWidth((currentWidth) =>
                Math.min(currentWidth, SIDEBAR_MAX_WIDTH),
            );
        };

        constrainSidebarWidth();
        window.addEventListener("resize", constrainSidebarWidth);
        return () =>
            window.removeEventListener("resize", constrainSidebarWidth);
    }, []);

    const startSidebarResize = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            event.preventDefault();

            const resize = (moveEvent: globalThis.PointerEvent): void => {
                setSidebarWidth(
                    Math.min(
                        Math.max(moveEvent.clientX, SIDEBAR_MIN_WIDTH),
                        SIDEBAR_MAX_WIDTH,
                    ),
                );
            };
            const stopResize = (): void => {
                window.removeEventListener("pointermove", resize);
                window.removeEventListener("pointerup", stopResize);
                window.removeEventListener("pointercancel", stopResize);
            };

            window.addEventListener("pointermove", resize);
            window.addEventListener("pointerup", stopResize, { once: true });
            window.addEventListener("pointercancel", stopResize, {
                once: true,
            });
        },
        [],
    );

    return (
        <ConfigProvider
            theme={{
                cssVar: { key: "tongji-student-theme" },
                token: {
                    colorBgLayout: "#fcfcfc",
                    colorPrimary: "#1d6cff",
                    borderRadius: 14,
                    fontFamily:
                        "Inter, PingFang SC, Microsoft YaHei, sans-serif",
                },
                components: {
                    Input: {
                        activeBorderColor: "transparent",
                        activeShadow: "none",
                        hoverBorderColor: "transparent",
                        inputFontSize: 16,
                    },
                },
            }}
        >
            <AppWatermark
                content={
                    userBasicInfo
                        ? `${userBasicInfo?.userId} · ${userBasicInfo?.name}`
                        : "Guest"
                }
            >
                <ThemeCssVariables />
                <div
                    className="chat-app-layout"
                    style={
                        {
                            "--session-sidebar-width": `${sidebarWidth}px`,
                        } as CSSProperties
                    }
                >
                    <SessionSidebar
                        createdSessions={createdSessions}
                        isMobileOpen={isMobileSidebarOpen}
                        onNewChat={handleNewChat}
                        onSessionDeleted={handleSessionDeleted}
                        onSessionSelect={handleSessionSelect}
                        selectedSessionId={sessionId}
                        streamingSessionId={
                            chat.isStreaming ? chat.activeSessionId : null
                        }
                        userBasicInfo={userBasicInfo}
                    />
                    {isMobileSidebarOpen ? (
                        <div
                            aria-hidden="true"
                            className="mobile-sidebar-backdrop"
                            onClick={() => setIsMobileSidebarOpen(false)}
                        />
                    ) : null}
                    <Button
                        aria-label={
                            isMobileSidebarOpen
                                ? "收起会话侧导"
                                : "展开会话侧导"
                        }
                        className={`mobile-sidebar-toggle${
                            isMobileSidebarOpen
                                ? " mobile-sidebar-toggle-open"
                                : ""
                        }`}
                        icon={
                            isMobileSidebarOpen ? (
                                <MenuFoldOutlined />
                            ) : (
                                <MenuUnfoldOutlined />
                            )
                        }
                        onClick={() =>
                            setIsMobileSidebarOpen((isOpen) => !isOpen)
                        }
                        type="text"
                    />
                    <div
                        aria-label="调整会话侧导宽度"
                        aria-orientation="vertical"
                        className="session-sidebar-resize-handle"
                        onPointerDown={startSidebarResize}
                        role="separator"
                    />
                    {sessionId ? (
                        <ChatArea chat={chat} />
                    ) : (
                        <WelcomePage
                            chat={chat}
                            isLoggedIn={userBasicInfo !== null}
                            onLoginRequired={openLoginReminder}
                            username={userBasicInfo?.name}
                        />
                    )}
                </div>
                <LoginReminderModal
                    onCancel={() => setIsLoginReminderOpen(false)}
                    onLogin={startOauth}
                    open={isLoginReminderOpen}
                />
                {import.meta.env.TEST_ENV === "true" ? (
                    <TestAccessTokenControl />
                ) : null}
            </AppWatermark>
        </ConfigProvider>
    );
}

function getResponseStatus(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const response = (error as { response?: unknown }).response;
    if (typeof response !== "object" || response === null) {
        return undefined;
    }

    const status = (response as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
}

export default App;
