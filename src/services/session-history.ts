import type {
    SessionMessages200Response,
    SessionMessages200ResponseMessagesItem,
} from "../cam-auto-generate/TongjiStudent/namespaces";
import { tongjiStudentService } from "./tongji-student";

const PAGE_SIZE = 50;
const DATABASE_NAME = "tongji-student";
const DATABASE_VERSION = 2;
const STORE_NAME = "session-history";

export type SessionHistory = {
    messages: SessionMessages200ResponseMessagesItem[];
    snapshotSequence: number;
};

type CachedSessionHistory = SessionHistory & {
	cacheKey: string;
	cachedAt: number;
};

// fetchSessionHistory 在同一 snapshot_sequence 内取得完整 canonical 历史。
export async function fetchSessionHistory(
    sessionId: string,
): Promise<SessionHistory> {
    const firstPage = await tongjiStudentService.SessionMessagesGET({
        limit: PAGE_SIZE,
        offset: 0,
        session_id: sessionId,
    });
    const pages: SessionMessages200Response[] = [firstPage];
    const snapshotSequence = firstPage.snapshot_sequence;

    if (firstPage.has_more) {
        // 并行拉取第二页和第三页
        const [secondPage, thirdPage] = await Promise.all([
            tongjiStudentService.SessionMessagesGET({
                limit: PAGE_SIZE,
                offset: PAGE_SIZE,
                session_id: sessionId,
                snapshot_sequence: snapshotSequence,
            }),
            tongjiStudentService.SessionMessagesGET({
                limit: PAGE_SIZE,
                offset: PAGE_SIZE * 2,
                session_id: sessionId,
                snapshot_sequence: snapshotSequence,
            }),
        ]);
        pages.push(secondPage, thirdPage);

        let nextPage = thirdPage;
        let offset = PAGE_SIZE * 3;
        while (nextPage.has_more) {
            nextPage = await tongjiStudentService.SessionMessagesGET({
                limit: PAGE_SIZE,
                offset,
                session_id: sessionId,
                snapshot_sequence: snapshotSequence,
            });
            pages.push(nextPage);
            offset += PAGE_SIZE;
        }
    }

    const messagesByID = new Map<string, SessionMessages200ResponseMessagesItem>();
    for (const page of pages) {
        for (const message of page.messages) {
            messagesByID.set(message.id, message);
        }
    }
    return {
        messages: [...messagesByID.values()].sort(
            (left, right) => left.sequence - right.sequence,
        ),
        snapshotSequence,
    };
}

// getCachedSessionHistory 从缓存中取得会话历史。
export async function getCachedSessionHistory(
    sessionId: string,
	cacheScope: string,
): Promise<SessionHistory | null> {
    const database = await openDatabase();
    if (!database) {
        return null;
    }
    try {
        const record = await requestResult<CachedSessionHistory | undefined>(
            database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(cacheKey(sessionId, cacheScope)),
        );
        return record
            ? {
                  messages: record.messages,
                  snapshotSequence: record.snapshotSequence,
              }
            : null;
    } finally {
        database.close();
    }
}

// cacheSessionHistory 缓存会话历史。
export async function cacheSessionHistory(
    sessionId: string,
	cacheScope: string,
    history: SessionHistory,
): Promise<void> {
    const database = await openDatabase();
    if (!database) {
        return;
    }
    try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put({
            ...history,
            cachedAt: Date.now(),
			cacheKey: cacheKey(sessionId, cacheScope),
        } satisfies CachedSessionHistory);
        await transactionCompleted(transaction);    // 等待事务完成
    } finally {
        database.close();
    }
}

// deleteCachedSessionHistory 在远端拒绝访问或会话删除后移除本地历史。
export async function deleteCachedSessionHistory(sessionId: string, cacheScope: string): Promise<void> {
	const database = await openDatabase();
	if (!database) return;
	try {
		const transaction = database.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).delete(cacheKey(sessionId, cacheScope));
		await transactionCompleted(transaction);
	} finally {
		database.close();
	}
}

// hasSameSessionMessages 检查两个会话历史是否相同。
export function hasSameSessionMessages(
    left: SessionHistory | null,
    right: SessionHistory,
): boolean {
    if (!left || left.messages.length !== right.messages.length) {
        return false;
    }
    return left.messages.every(
        (message, index) =>
            message.id === right.messages[index]?.id &&
            message.sequence === right.messages[index]?.sequence,
    );
}

// openDatabase 打开 IndexedDB 数据库。
function openDatabase(): Promise<IDBDatabase | null> {
    if (!("indexedDB" in globalThis)) {
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (event) => {
			if (event.oldVersion < 2 && request.result.objectStoreNames.contains(STORE_NAME)) {
				request.result.deleteObjectStore(STORE_NAME);
			}
			if (!request.result.objectStoreNames.contains(STORE_NAME)) {
				request.result.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function cacheKey(sessionId: string, cacheScope: string): string {
	return `${cacheScope}:${sessionId}`;
}

// requestResult 处理 IndexedDB 请求结果。
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// transactionCompleted 处理 IndexedDB 事务完成。
function transactionCompleted(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
}
