import type { SessionSummary } from "../hooks/use-chat";

const ANONYMOUS_SESSIONS_KEY = "anonymous-sessions";

export const getAnonymousSessions = (): SessionSummary[] => {
    return JSON.parse(localStorage.getItem(ANONYMOUS_SESSIONS_KEY) || "[]");
};

export const addAnonymousSession = (session: SessionSummary): void => {
    const sessions = getAnonymousSessions();
    sessions.push(session);
    // 按 lastActiveAt 排序
    sessions.sort(
        (a, b) =>
            new Date(b.lastActiveAt).getTime() -
            new Date(a.lastActiveAt).getTime(),
    );
    localStorage.setItem(ANONYMOUS_SESSIONS_KEY, JSON.stringify(sessions));
};

export const removeAnonymousSession = (sessionId: string): void => {
    const sessions = getAnonymousSessions();
    const filteredSessions = sessions.filter((s) => s.id !== sessionId);
    // 按 lastActiveAt 排序
    filteredSessions.sort(
        (a, b) =>
            new Date(b.lastActiveAt).getTime() -
            new Date(a.lastActiveAt).getTime(),
    );
    localStorage.setItem(
        ANONYMOUS_SESSIONS_KEY,
        JSON.stringify(filteredSessions),
    );
};

export const clearAnonymousSessions = (): void => {
    localStorage.setItem(ANONYMOUS_SESSIONS_KEY, "[]");
};

export const updateAnonymousSessionLastActiveAt = (sessionId: string): void => {
    const sessions = getAnonymousSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
        session.lastActiveAt = new Date().toISOString();
        // 按 lastActiveAt 排序
        sessions.sort(
            (a, b) =>
                new Date(b.lastActiveAt).getTime() -
                new Date(a.lastActiveAt).getTime(),
        );
        localStorage.setItem(ANONYMOUS_SESSIONS_KEY, JSON.stringify(sessions));
    }
};
