// ChatStreamEvent 是 Chat UI 消费的稳定流式事件模型，与服务端原始事件解耦。
export type ChatStreamEvent =
    | { type: "status"; label: string; detail?: string }
    | { type: "reasoning"; text: string }
    | { type: "tool_started"; id: string; label: string }
    | { type: "tool_completed"; id: string; label: string; durationMs?: number }
    | { type: "delta"; text: string }
    | { type: "completed"; durationMs?: number }
    | { type: "failed"; message: string };

export type ChatSession = {
    id: string;
    persistence: "ephemeral" | "durable";
};

export type StreamMessageParams = {
    sessionId: string;
    message: string;
    signal: AbortSignal;
};

export interface ChatGateway {
    createSession(): Promise<ChatSession>;
    streamMessage(params: StreamMessageParams): AsyncIterable<ChatStreamEvent>;
}
