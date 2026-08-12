import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionMessagesPOST: vi.fn(),
  SessionPOST: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { takeSseFrames, useChat } from "../../src/hooks/use-chat";
import { addAnonymousSession, getAnonymousSessions } from "../../src/utils/anonymous-session";

describe("useChat SSE parser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    tongjiStudentService.SessionMessagesPOST.mockReset();
    tongjiStudentService.SessionPOST.mockReset();
  });

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

  it("应在复用匿名会话发送消息时更新其最近活跃时间", async () => {
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "anonymous-1" });
    tongjiStudentService.SessionMessagesPOST.mockResolvedValue({});
    addAnonymousSession({
      id: "anonymous-1",
      lastActiveAt: "2026-08-10T10:00:00.000Z",
      name: "匿名会话",
    });
    const { result } = renderHook(() => useChat({ isAnonymous: true }));

    await act(async () => {
      await result.current.submitQuestion("第一轮");
      await result.current.submitQuestion("第二轮");
    });

    expect(tongjiStudentService.SessionPOST).toHaveBeenCalledOnce();
    expect(getAnonymousSessions()[0]?.lastActiveAt).not.toBe("2026-08-10T10:00:00.000Z");
  });
});
