import { describe, expect, it, vi } from "vitest";
import { streamMockReply, type StreamEvent } from "../../src/components/chat-area/mock-stream";

// collectEvents 收集 Mock 流的全部事件，以便验证顺序和最终文本。
async function collectEvents(generator: AsyncGenerator<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];

  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe("streamMockReply", () => {
  it("应按 Agent 工作过程和最终文本顺序产出事件", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const eventsPromise = collectEvents(streamMockReply("校园卡办理", controller.signal));

    await vi.runAllTimersAsync();
    const events = await eventsPromise;

    expect(events.map((event) => event.type)).toEqual([
      "status",
      "reasoning",
      "tool_started",
      "tool_completed",
      "status",
      ...Array.from({ length: events.filter((event) => event.type === "delta").length }, () => "delta"),
      "completed",
    ]);
    expect(events.filter((event) => event.type === "delta").map((event) => event.text).join("")).toContain("校园卡办理");

    vi.useRealTimers();
  });

  it("应在 AbortSignal 取消后终止等待", async () => {
    const controller = new AbortController();
    const generator = streamMockReply("校园卡办理", controller.signal);

    await expect(generator.next()).resolves.toMatchObject({ value: { type: "status" } });
    const pendingEvent = generator.next();
    controller.abort();

    await expect(pendingEvent).rejects.toMatchObject({ name: "AbortError" });
  });
});
