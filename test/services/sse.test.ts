import { describe, expect, it } from "vitest";
import {
  mapServerChatEvent,
  parseSseEventStream,
} from "../../src/services/chat/sse";

// collectEvents 收集异步 SSE 事件以便断言网络分块不会影响事件边界。
async function collectEvents<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const events: T[] = [];

  for await (const event of generator) {
    events.push(event);
  }

  return events;
}

function createStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("SSE parser", () => {
  it("应还原被任意网络分块截断的多个 SSE 事件", async () => {
    const events = await collectEvents(
      parseSseEventStream(
        createStream([
          'data: {"type":"assistant.del',
          'ta","data":{"text":"你好"}}\n\n',
          'data: {"type":"run.completed","data":{}}\r\n\r\n',
        ]),
      ),
    );

    expect(events).toEqual([
      { type: "assistant.delta", data: { text: "你好" } },
      { type: "run.completed", data: {} },
    ]);
  });

  it("应将服务端事件映射为 Chat UI 事件并忽略无关事件", () => {
    expect(
      mapServerChatEvent({
        type: "tool.call.completed",
        data: { id: "search", name: "校园检索", duration_ms: 120 },
      }),
    ).toEqual({
      type: "tool_completed",
      id: "search",
      label: "校园检索",
      durationMs: 120,
    });
    expect(
      mapServerChatEvent({
        type: "run.completed",
        data: { duration_ms: 61_000 },
      }),
    ).toEqual({ type: "completed", durationMs: 61_000 });
    expect(
      mapServerChatEvent({
        type: "run.failed",
        data: { message: "上游服务返回内部诊断" },
      }),
    ).toEqual({ type: "failed", message: "生成失败，请稍后重试。" });
    expect(mapServerChatEvent({ type: "task_plan.updated" })).toBeNull();
  });
});
