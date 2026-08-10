import { createApiSession } from "../../api/tongji-student/cam-client";
import { apiHttp } from "../../api/http";
import { mapServerChatEvent, parseSseEventStream } from "./sse";
import type { ChatGateway, ChatStreamEvent, StreamMessageParams } from "./types";

// tongjiStudentChatGateway 负责 AI 服务会话与 SSE 事件，不将 CAM 生成客户端暴露给 UI。
export const tongjiStudentChatGateway: ChatGateway = {
    createSession: createApiSession,
    streamMessage,
};

async function* streamMessage({
    sessionId,
    message,
    signal,
}: StreamMessageParams): AsyncGenerator<ChatStreamEvent> {
    let lastSequence = 0;
    const response = await apiHttp.post<ReadableStream<Uint8Array>>(
        `/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
        { message },
        {
            adapter: "fetch",
            headers: { Accept: "text/event-stream" },
            responseType: "stream",
            signal,
        },
    );

    for await (const serverEvent of parseSseEventStream(response.data)) {
        if (typeof serverEvent.seq === "number") {
            if (serverEvent.seq <= lastSequence) {
                continue;
            }
            lastSequence = serverEvent.seq;
        }
        const event = mapServerChatEvent(serverEvent);
        if (event) {
            yield event;
        }
    }
}
