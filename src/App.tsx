import { useCallback, useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, ConfigProvider } from "antd";
import { SessionSidebar } from "./components/session-sidebar/SessionSidebar";
import { ChatArea } from "./components/chat-area/ChatArea";
import { type CreatedSession, useChat } from "./hooks/use-chat";
import { useSessionRoute } from "./hooks/use-session-route";

const SIDEBAR_DEFAULT_WIDTH = 260;
const SIDEBAR_MIN_WIDTH = 224;
const SIDEBAR_MAX_WIDTH = 570;

// App 负责全局 antd 主题和聊天区域装配。
function App() {
  const { openNewChat, openSession, sessionId } = useSessionRoute();
  const [createdSessions, setCreatedSessions] = useState<CreatedSession[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const handleSessionCreated = useCallback(async (session: CreatedSession): Promise<void> => {
    setCreatedSessions((currentSessions) => [
      session,
      ...currentSessions.filter((currentSession) => currentSession.id !== session.id),
    ]);
    openSession(session.id);
    await Promise.resolve();
  }, [openSession]);
  const chat = useChat({ onSessionCreated: handleSessionCreated });
  const { restoreSession, startNewChat } = chat;
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const handleNewChat = useCallback((): void => {
    setIsMobileSidebarOpen(false);
    openNewChat();
  }, [openNewChat]);
  const handleSessionSelect = useCallback((nextSessionId: string): void => {
    setIsMobileSidebarOpen(false);
    openSession(nextSessionId);
  }, [openSession]);

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
    const constrainSidebarWidth = (): void => {
      setSidebarWidth((currentWidth) =>
        Math.min(currentWidth, SIDEBAR_MAX_WIDTH),
      );
    };

    constrainSidebarWidth();
    window.addEventListener("resize", constrainSidebarWidth);
    return () => window.removeEventListener("resize", constrainSidebarWidth);
  }, []);

  const startSidebarResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
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
    window.addEventListener("pointercancel", stopResize, { once: true });
  }, []);

  return (
    <ConfigProvider
      theme={{
        cssVar: { key: "tongji-student-theme" },
        token: {
          colorBgLayout: "#fcfcfc",
          colorPrimary: "#1d6cff",
          borderRadius: 14,
          fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif",
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
          onSessionSelect={handleSessionSelect}
          selectedSessionId={sessionId}
        />
        {isMobileSidebarOpen ? (
          <div
            aria-hidden="true"
            className="mobile-sidebar-backdrop"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        ) : null}
        <Button
          aria-label={isMobileSidebarOpen ? "收起会话侧导" : "展开会话侧导"}
          className={`mobile-sidebar-toggle${
            isMobileSidebarOpen ? " mobile-sidebar-toggle-open" : ""
          }`}
          icon={isMobileSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
          type="text"
        />
        <div
          aria-label="调整会话侧导宽度"
          aria-orientation="vertical"
          className="session-sidebar-resize-handle"
          onPointerDown={startSidebarResize}
          role="separator"
        />
        <ChatArea chat={chat} />
      </div>
    </ConfigProvider>
  );
}

export default App;
