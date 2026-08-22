import { useCallback, useEffect, useState } from "react";

const APP_BASE_PATH = import.meta.env.BASE_URL;

// useSessionRoute 将浏览器路径映射为当前会话，避免引入额外路由依赖。
export function useSessionRoute() {
    const [sessionId, setSessionId] = useState(getSessionIdFromLocation);

    useEffect(() => {
        const handlePopState = (): void => {
            setSessionId(getSessionIdFromLocation());
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const openSession = useCallback((nextSessionId: string): void => {
        const path = `${APP_BASE_PATH}session/${encodeURIComponent(nextSessionId)}`;
        window.history.pushState(null, "", path);
        setSessionId(nextSessionId);
    }, []);

    const openNewChat = useCallback((): void => {
        window.history.pushState(null, "", APP_BASE_PATH);
        setSessionId(null);
    }, []);

    return { openNewChat, openSession, sessionId };
}

function getSessionIdFromLocation(): string | null {
    const sessionPathPrefix = `${APP_BASE_PATH}session/`;
    if (!window.location.pathname.startsWith(sessionPathPrefix)) {
        return null;
    }

    const encodedSessionId = window.location.pathname.slice(
        sessionPathPrefix.length,
    );
    if (!encodedSessionId || encodedSessionId.includes("/")) {
        return null;
    }

    try {
        return decodeURIComponent(encodedSessionId);
    } catch {
        return null;
    }
}
