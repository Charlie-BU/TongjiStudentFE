// ServerChatEvent 保留服务端事件外壳，data 在映射至领域事件前不向上层泄漏。
export type ServerChatEvent = {
    type: string;
    data?: unknown;
    seq?: number;
};

// parseSseEventStream 按 SSE 空行分帧，支持网络分块截断和同一块中的多个事件。
export async function* parseSseEventStream(
    stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerChatEvent> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });

            const frames = takeSseFrames(buffer);
            buffer = frames.remainder;
            for (const frame of frames.items) {
                const event = parseSseFrame(frame);
                if (event) {
                    yield event;
                }
            }

            if (done) {
                break;
            }
        }

        const event = parseSseFrame(buffer);
        if (event) {
            yield event;
        }
    } finally {
        reader.releaseLock();
    }
}

// mapServerChatEvent 将不稳定的服务端 data 映射为供 Chat UI 使用的领域事件。
export function mapServerChatEvent(
    event: ServerChatEvent,
): import("./types").ChatStreamEvent | null {
    const data = toRecord(event.data);

    switch (event.type) {
        case "agent.status":
            return {
                type: "status",
                label: readText(data, ["label", "message", "status"], "正在处理"),
                detail: readOptionalText(data, ["detail", "description"]),
            };
        case "assistant.reasoning":
            return {
                type: "reasoning",
                text: readText(data, ["text", "content", "reasoning_content"]),
            };
        case "assistant.delta":
            return {
                type: "delta",
                text: readText(data, ["text", "content", "delta"]),
            };
        case "tool.call.started":
            return {
                type: "tool_started",
                id: readText(data, ["id", "tool_call_id", "toolCallId"], "tool"),
                label: readText(data, ["label", "name", "tool_name"], "正在调用工具"),
            };
        case "tool.call.completed":
            return {
                type: "tool_completed",
                id: readText(data, ["id", "tool_call_id", "toolCallId"], "tool"),
                label: readText(data, ["label", "name", "tool_name"], "工具调用完成"),
                durationMs: readOptionalNumber(data, ["duration_ms", "durationMs"]),
            };
        case "run.completed":
            return { type: "completed" };
        case "run.failed":
            return {
                type: "failed",
                // 服务端错误可能包含内部或上游细节，不能直接暴露给聊天界面。
                message: "生成失败，请稍后重试。",
            };
        default:
            return null;
    }
}

function takeSseFrames(input: string): { items: string[]; remainder: string } {
    const items: string[] = [];
    let remainder = input;
    let separatorIndex = remainder.search(/\r?\n\r?\n/);

    while (separatorIndex >= 0) {
        items.push(remainder.slice(0, separatorIndex));
        remainder = remainder.slice(
            separatorIndex + (remainder[separatorIndex] === "\r" ? 4 : 2),
        );
        separatorIndex = remainder.search(/\r?\n\r?\n/);
    }

    return { items, remainder };
}

function parseSseFrame(frame: string): ServerChatEvent | null {
    const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

    if (!data || data === "[DONE]") {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(data);
        const event = toRecord(parsed);
        return typeof event.type === "string" ? (event as ServerChatEvent) : null;
    } catch {
        return null;
    }
}

function toRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
}

function readText(
    value: Record<string, unknown>,
    keys: string[],
    fallback = "",
): string {
    return readOptionalText(value, keys) ?? fallback;
}

function readOptionalText(
    value: Record<string, unknown>,
    keys: string[],
): string | undefined {
    for (const key of keys) {
        if (typeof value[key] === "string") {
            return value[key];
        }
    }
    return undefined;
}

function readOptionalNumber(
    value: Record<string, unknown>,
    keys: string[],
): number | undefined {
    for (const key of keys) {
        if (typeof value[key] === "number") {
            return value[key];
        }
    }
    return undefined;
}
