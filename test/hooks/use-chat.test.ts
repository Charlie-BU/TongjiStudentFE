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

  it.each([false, true])("缺少终态时应提示连接中断并保留已收到的内容（部分帧：%s）", async (partialFrame) => {
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "interrupted-session" });
    tongjiStudentService.SessionMessagesPOST.mockImplementation(async (_request, options) => {
      const payload = 'data: {"seq":1,"type":"assistant.delta","data":{"text":"已收到的回答"}}\n\n'
        + (partialFrame ? 'data: {"seq":2,"type":"run.compl' : "");
      options.onDownloadProgress({ event: { target: { responseText: payload } } });
      return payload;
    });
    const { result } = renderHook(() => useChat());

    await act(async () => { await result.current.submitQuestion("测试提前断流"); });

    expect(result.current.turns[0]).toMatchObject({
      answer: "已收到的回答",
      state: "failed",
      error: "连接中断，回答可能尚未完成，请稍后刷新页面查看。",
    });
    expect(result.current.isStreaming).toBe(false);
    expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledOnce();
  });

  it("收到失败终态后不应覆盖为连接中断", async () => {
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "failed-session" });
    tongjiStudentService.SessionMessagesPOST.mockImplementation(async (_request, options) => {
      options.onDownloadProgress({ event: { target: {
        responseText: 'data: {"seq":1,"type":"run.failed","data":{}}\n\n',
      } } });
    });
    const { result } = renderHook(() => useChat());

    await act(async () => { await result.current.submitQuestion("失败终态"); });

    expect(result.current.turns[0]).toMatchObject({ state: "failed", error: "生成失败，请稍后重试。" });
    expect(result.current.isStreaming).toBe(false);
  });

  it("应发送所选档位，并允许同一会话逐轮切换", async () => {
    tongjiStudentService.SessionPOST.mockResolvedValue({session_id: "tier-session"});
    tongjiStudentService.SessionMessagesPOST.mockResolvedValue({});
    const {result} = renderHook(() => useChat());
    for (const tier of ["lite", "pro", "max"] as const) {
      act(() => result.current.setModelTier(tier));
      await act(async () => { await result.current.submitQuestion(`使用 ${tier}`); });
      expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenLastCalledWith(
        {message: `使用 ${tier}`, session_id: "tier-session", model_tier: tier}, expect.any(Object),
      );
    }
    expect(tongjiStudentService.SessionPOST).toHaveBeenCalledOnce();
  });

  it("会话创建期间改变选择不会影响已经提交的本轮档位", async () => {
    let resolveSession!: (session: {session_id: string}) => void;
    tongjiStudentService.SessionPOST.mockReturnValue(new Promise((resolve) => {resolveSession = resolve;}));
    tongjiStudentService.SessionMessagesPOST.mockResolvedValue({});
    const {result} = renderHook(() => useChat());
    act(() => result.current.setModelTier("pro"));
    let pending!: Promise<void>;
    act(() => {pending = result.current.submitQuestion("hello");});
    act(() => result.current.setModelTier("max"));
    await act(async () => {resolveSession({session_id:"tier-session"}); await pending;});
    expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledWith(
      {message:"hello", session_id:"tier-session", model_tier:"pro"}, expect.any(Object),
    );
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

  it("应追加推理增量、忽略重复序号，并隔离不同轮次", async () => {
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "delta-session" });
    tongjiStudentService.SessionMessagesPOST.mockImplementation(async (_request, options) => {
      const events = [
        { seq: 1, type: "assistant.reasoning", data: { delta: "先查" } },
        { seq: 2, type: "assistant.reasoning", data: { delta: "课表" } },
        { seq: 2, type: "assistant.reasoning", data: { delta: "课表" } },
        { seq: 3, type: "assistant.reasoning", data: { delta: "", text: "不得回退成快照" } },
        { seq: 4, type: "tool.call.started", data: { call_id: "call-1", tool: "lookup" } },
        { seq: 5, type: "assistant.reasoning", data: { delta: "再分析" } },
        { seq: 6, type: "assistant.delta", data: { text: "完成" } },
        { seq: 7, type: "run.completed", data: {} },
      ];
      const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
      // 模拟网络分块落在事件中间，Axios 每次提供累计响应。
      for (const end of [17, 93, payload.length]) {
        options.onDownloadProgress({ event: { target: { responseText: payload.slice(0, end) } } });
      }
    });
    const { result } = renderHook(() => useChat());
    for (const question of ["第一轮", "第二轮"]) {
      await act(async () => { await result.current.submitQuestion(question); });
    }
    expect(result.current.turns).toHaveLength(2);
    for (const turn of result.current.turns) {
      expect(turn.reasoning).toBe("先查课表再分析");
      expect(turn.answer).toBe("完成");
      expect(turn.state).toBe("completed");
    }
  });

  it("应忽略没有字符串 delta 的推理事件", async () => {
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "legacy-session" });
    tongjiStudentService.SessionMessagesPOST.mockImplementation(async (_request, options) => {
      const payload = [{ delta: "已有推理" }, { text: "旧快照" }, {}, { delta: null }, { delta: 123 }].map((data) =>
        `data: ${JSON.stringify({ type: "assistant.reasoning", data })}\n\n`,
      ).join("");
      options.onDownloadProgress({ event: { target: { responseText: payload } } });
    });
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.submitQuestion("旧服务"); });
    expect(result.current.turns[0].reasoning).toBe("已有推理");
  });

  it("恢复历史时应合并同轮多次模型调用的推理，与增量展示一致", async () => {
    sessionHistory.getCachedSessionHistory.mockResolvedValue(null);
    sessionHistory.cacheSessionHistory.mockResolvedValue(undefined);
    sessionHistory.fetchSessionHistory.mockResolvedValue({ messages: [
      { role: "user", run_id: "run-1", sequence: 1, content: "查询课表" },
      { role: "assistant", run_id: "run-1", sequence: 2, reasoning_content: "先查课表", content: "" },
      { role: "tool", run_id: "run-1", sequence: 3, content: "测试结果" },
      { role: "assistant", run_id: "run-1", sequence: 4, reasoning_content: "再分析", content: "完成" },
    ] });
    const { result } = renderHook(() => useChat());
    await act(async () => { await result.current.restoreSession("history-session"); });
    expect(result.current.turns[0].reasoning).toBe("先查课表再分析");
    expect(result.current.turns[0].answer).toBe("完成");
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
