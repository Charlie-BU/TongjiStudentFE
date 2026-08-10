import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionGET: vi.fn(),
  SessionMessagesGET: vi.fn(),
  SessionMessagesPOST: vi.fn(),
  SessionPOST: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import App from "../../src/App";

describe("App", () => {
  beforeEach(() => {
    tongjiStudentService.SessionGET.mockResolvedValue({ sessions: [] });
    tongjiStudentService.SessionMessagesGET.mockResolvedValue({ messages: [] });
    tongjiStudentService.SessionMessagesPOST.mockResolvedValue({});
    tongjiStudentService.SessionPOST.mockResolvedValue({
      persistence: "durable",
      session_id: "new-session-1",
    });
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("应装配主题与聊天输入页", () => {
    render(<App />);

    expect(screen.getByLabelText("输入校园问题")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送问题" })).toBeDisabled();
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
