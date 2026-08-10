import { describe, expect, it } from "vitest";
import { takeSseFrames } from "../../src/hooks/use-chat";

describe("useChat SSE parser", () => {
  it("应还原被任意网络分块截断的多个 SSE 事件", () => {
    const first = takeSseFrames('data: {"type":"assistant.del');
    const second = takeSseFrames(
      `${first.remainder}ta","data":{"text":"你好"}}\n\ndata: {"type":"run.completed","data":{}}\r\n\r\n`,
    );

    expect(second.events).toEqual([
      { type: "assistant.delta", data: { text: "你好" } },
      { type: "run.completed", data: {} },
    ]);
    expect(second.remainder).toBe("");
  });
});
