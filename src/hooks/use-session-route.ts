import { useCallback, useEffect, useState } from "react";

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
        const path = `/session/${encodeURIComponent(nextSessionId)}`;
        window.history.pushState(null, "", path);
        setSessionId(nextSessionId);
    }, []);

    const openNewChat = useCallback((): void => {
        window.history.pushState(null, "", "/");
        setSessionId(null);
    }, []);

    return { openNewChat, openSession, sessionId };
}

function getSessionIdFromLocation(): string | null {
    const match = window.location.pathname.match(/^\/session\/([^/]+)$/);
    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}
