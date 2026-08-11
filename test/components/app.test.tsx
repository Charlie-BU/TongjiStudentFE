import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionGET: vi.fn(),
  SessionMessagesGET: vi.fn(),
  SessionMessagesPOST: vi.fn(),
  SessionPOST: vi.fn(),
  UserBasicInfoGET: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import App from "../../src/App";
import { TestAccessTokenControl } from "../../src/components/test-access-token/TestAccessTokenControl";

describe("App", () => {
  beforeEach(() => {
    tongjiStudentService.SessionGET.mockResolvedValue({ sessions: [] });
    tongjiStudentService.SessionMessagesGET.mockResolvedValue({ messages: [] });
    tongjiStudentService.SessionMessagesPOST.mockResolvedValue({});
    tongjiStudentService.SessionPOST.mockResolvedValue({
      persistence: "durable",
      session_id: "new-session-1",
    });
    tongjiStudentService.UserBasicInfoGET.mockResolvedValue({
      name: "测试同学",
      userId: "test-student-001",
      userTypeName: "本科生",
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("应装配主题与聊天输入页", () => {
    render(<App />);

    expect(screen.getByLabelText("输入校园问题")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送问题" })).toBeDisabled();
  });

  it("应在页面挂载时获取并展示用户基础信息", async () => {
    render(<App />);

    expect(await screen.findByText("测试同学")).toBeInTheDocument();
    expect(screen.getByText("test-student-001 · 本科生")).toBeInTheDocument();
    expect(tongjiStudentService.UserBasicInfoGET).toHaveBeenCalledWith({});
  });

  it("应在用户信息请求的非认证失败时保留 Access Token", async () => {
    window.localStorage.setItem("tongji-access-token", "test-access-token");
    tongjiStudentService.UserBasicInfoGET.mockRejectedValueOnce(new Error("network failure"));

    render(<App />);

    await waitFor(() => {
      expect(tongjiStudentService.UserBasicInfoGET).toHaveBeenCalledWith({});
    });
    expect(window.localStorage.getItem("tongji-access-token")).toBe("test-access-token");
  });

  it("应仅在用户信息请求明确返回 401 时清除 Access Token", async () => {
    window.localStorage.setItem("tongji-access-token", "test-access-token");
    tongjiStudentService.UserBasicInfoGET.mockRejectedValueOnce({ response: { status: 401 } });

    render(<App />);

    await waitFor(() => {
      expect(window.localStorage.getItem("tongji-access-token")).toBeNull();
    });
  });

  it("应在测试环境显示手动配置 Tongji Access Token 的入口", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "配置测试 Tongji Access Token" })).toBeInTheDocument();
  });

  it("应保存手动输入的 Tongji Access Token 后刷新页面", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<TestAccessTokenControl onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "配置测试 Tongji Access Token" }));
    await user.type(screen.getByLabelText("输入 Tongji Access Token"), "test-access-token");
    await user.click(screen.getByRole("button", { name: /保\s*存/ }));

    expect(window.localStorage.getItem("tongji-access-token")).toBe("test-access-token");
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("应支持拖拽测试 Token 按钮且不触发弹窗", () => {
    render(<App />);
    const trigger = screen.getByRole("button", { name: "配置测试 Tongji Access Token" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 740,
      height: 40,
      left: 900,
      right: 940,
      toJSON: () => ({}),
      top: 700,
      width: 40,
      x: 900,
      y: 700,
    });

    fireEvent.pointerDown(trigger, { clientX: 910, clientY: 710, pointerId: 1 });
    fireEvent.pointerMove(trigger, { clientX: 110, clientY: 120, movementX: -800, movementY: -590, pointerId: 1 });
    fireEvent.pointerUp(trigger, { pointerId: 1 });
    fireEvent.click(trigger);

    expect(trigger).toHaveStyle({ left: "100px", top: "110px" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("应根据 session 路由恢复当前会话快照", async () => {
    window.history.replaceState(null, "", "/session/session-1");
    tongjiStudentService.SessionMessagesGET.mockResolvedValue({
      messages: [
        {
          content: "校园卡在哪里办理？",
          created_at: "2026-08-10T10:00:00Z",
          id: "user-1",
          role: "user",
          run_id: "run-1",
          sequence: 1,
        },
        {
          content: "可前往校园服务中心办理。",
          created_at: "2026-08-10T10:00:01Z",
          id: "assistant-1",
          reasoning_content: "正在查询校园服务中心信息。",
          role: "assistant",
          run_id: "run-1",
          sequence: 2,
        },
      ],
    });

    render(<App />);

    expect(await screen.findByText("可前往校园服务中心办理。")).toBeInTheDocument();
    expect(screen.getByText("已工作 1 秒")).toBeInTheDocument();
    expect(tongjiStudentService.SessionMessagesGET).toHaveBeenCalledWith({
      limit: 100,
      session_id: "session-1",
    });
  });

  it("应在新建聊天后忽略尚未完成的会话恢复", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/session/session-1");
    let resolveHistory: (response: unknown) => void;
    tongjiStudentService.SessionMessagesGET.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHistory = resolve;
        }),
    );

    render(<App />);

    await waitFor(() => {
      expect(tongjiStudentService.SessionMessagesGET).toHaveBeenCalledWith({
        limit: 100,
        session_id: "session-1",
      });
    });
    await user.click(screen.getByRole("button", { name: "New Chat" }));

    await act(async () => {
      resolveHistory!({
        messages: [
          {
            content: "旧问题",
            role: "user",
            run_id: "run-1",
            sequence: 1,
          },
          {
            content: "不应出现在新聊天中的旧回答",
            role: "assistant",
            run_id: "run-1",
            sequence: 2,
          },
        ],
      });
    });

    expect(screen.queryByText("不应出现在新聊天中的旧回答")).not.toBeInTheDocument();
  });

  it("应在新建 session 加入列表并完成路由跳转后发起 Agent 请求", async () => {
    const user = userEvent.setup();
    tongjiStudentService.SessionMessagesPOST.mockImplementation(async () => {
      expect(window.location.pathname).toBe("/session/new-session-1");
      expect(screen.getByText("New Session")).toBeInTheDocument();
      return {};
    });

    render(<App />);

    await user.type(screen.getByLabelText("输入校园问题"), "查询校园卡");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    await waitFor(() => {
      expect(tongjiStudentService.SessionPOST).toHaveBeenCalledWith({});
      expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledWith(
        { message: "查询校园卡", session_id: "new-session-1" },
        expect.any(Object),
      );
    });
  });
});
