import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionMessagesPOST: vi.fn(),
  SessionPOST: vi.fn(),
}));

const sessionHistory = vi.hoisted(() => ({
  cacheSessionHistory: vi.fn(),
  deleteCachedSessionHistory: vi.fn(),
  fetchSessionHistory: vi.fn(),
  getCachedSessionHistory: vi.fn(),
  hasSameSessionMessages: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));
vi.mock("../../src/services/session-history", () => sessionHistory);

import { takeSseFrames, useChat } from "../../src/hooks/use-chat";
import { addAnonymousSession, getAnonymousSessions } from "../../src/utils/anonymous-session";

describe("useChat SSE parser", () => {
  beforeEach(() => {
    window.localStorage.clear();
    tongjiStudentService.SessionMessagesPOST.mockReset();
    tongjiStudentService.SessionPOST.mockReset();
		sessionHistory.cacheSessionHistory.mockReset();
		sessionHistory.deleteCachedSessionHistory.mockReset();
		sessionHistory.fetchSessionHistory.mockReset();
		sessionHistory.getCachedSessionHistory.mockReset();
		sessionHistory.hasSameSessionMessages.mockReset();
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

  it("远端拒绝恢复时应清空并删除当前用户的缓存", async () => {
    sessionHistory.getCachedSessionHistory.mockResolvedValue({
      messages: [],
      snapshotSequence: 3,
    });
    sessionHistory.fetchSessionHistory.mockRejectedValue(new Error("forbidden"));
    sessionHistory.deleteCachedSessionHistory.mockResolvedValue(undefined);
    const onSessionRestoreFailed = vi.fn();
    const { result } = renderHook(() => useChat({ cacheScope: "user-001", onSessionRestoreFailed }));

    await act(async () => {
      await result.current.restoreSession("session-1");
    });

    expect(sessionHistory.deleteCachedSessionHistory).toHaveBeenCalledWith("session-1", "user-001");
    expect(onSessionRestoreFailed).toHaveBeenCalledOnce();
  });
});
