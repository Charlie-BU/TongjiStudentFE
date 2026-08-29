import type { UserBasicInfo200Response } from "../cam-auto-generate/TongjiStudent/namespaces";
import type { SessionSummary } from "../hooks/use-chat";

const USER_BASIC_INFO_CACHE_KEY = "tongji-user-basic-info";
const SESSION_LIST_CACHE_KEY_PREFIX = "tongji-session-list:";

// 首屏数据量很小，使用 localStorage 以便在进入应用时同步恢复，再由远端请求静默刷新。
export function getCachedUserBasicInfo(): UserBasicInfo200Response | null {
    const value = readCache(USER_BASIC_INFO_CACHE_KEY);
    if (!isUserBasicInfo(value)) {
        return null;
    }
    return value;
}

export function cacheUserBasicInfo(user: UserBasicInfo200Response): void {
    writeCache(USER_BASIC_INFO_CACHE_KEY, user);
}

export function clearCachedUserBasicInfo(): void {
    window.localStorage.removeItem(USER_BASIC_INFO_CACHE_KEY);
}

export function getCachedSessions(userId: string): SessionSummary[] | null {
    const value = readCache(sessionListCacheKey(userId));
    if (!Array.isArray(value) || !value.every(isSessionSummary)) {
        return null;
    }
    return value;
}

export function cacheSessions(userId: string, sessions: SessionSummary[]): void {
    writeCache(sessionListCacheKey(userId), sessions);
}

export function clearCachedSessions(userId: string): void {
    window.localStorage.removeItem(sessionListCacheKey(userId));
}

function sessionListCacheKey(userId: string): string {
    return `${SESSION_LIST_CACHE_KEY_PREFIX}${userId}`;
}

function readCache(key: string): unknown {
    try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function writeCache(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // 本地存储不可用时仍可正常使用远端数据。
    }
}

function isUserBasicInfo(value: unknown): value is UserBasicInfo200Response {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as UserBasicInfo200Response).name === "string" &&
        typeof (value as UserBasicInfo200Response).userId === "string" &&
        typeof (value as UserBasicInfo200Response).userTypeName === "string"
    );
}

function isSessionSummary(value: unknown): value is SessionSummary {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as SessionSummary).id === "string" &&
        typeof (value as SessionSummary).name === "string" &&
        typeof (value as SessionSummary).lastActiveAt === "string"
    );
}
