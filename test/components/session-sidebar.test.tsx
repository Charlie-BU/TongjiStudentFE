import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionGET: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { SessionSidebar } from "../../src/components/session-sidebar/SessionSidebar";

describe("SessionSidebar", () => {
  beforeEach(() => {
    tongjiStudentService.SessionGET.mockReset();
  });

  it("应按最近活跃时间倒序展示服务端会话", async () => {
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "older", name: "较早会话", last_active_at: "2026-08-09T10:00:00Z" },
        { id: "newer", name: "最新会话", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });

    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={vi.fn()} selectedSessionId={null} />);

    await screen.findByText("最新会话");
    const sessions = screen.getAllByText(/会话/);
    expect(sessions.map((session) => session.textContent)).toEqual([
      "最新会话",
      "较早会话",
    ]);
    expect(tongjiStudentService.SessionGET).toHaveBeenCalledWith({});
  });

  it("应将 New Chat 操作交给上层会话状态", async () => {
    const user = userEvent.setup();
    const onNewChat = vi.fn();
    tongjiStudentService.SessionGET.mockResolvedValue({ sessions: [] });

    render(<SessionSidebar createdSessions={[]} onNewChat={onNewChat} onSessionSelect={vi.fn()} selectedSessionId={null} />);

    await user.click(screen.getByRole("button", { name: "New Chat" }));
    expect(onNewChat).toHaveBeenCalledOnce();
  });

  it("应将点击的最近会话交给上层路由", async () => {
    const user = userEvent.setup();
    const onSessionSelect = vi.fn();
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "session-2", name: "校园卡咨询", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });

    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={onSessionSelect} selectedSessionId={null} />);

    await user.click(await screen.findByRole("button", { name: "校园卡咨询" }));
    expect(onSessionSelect).toHaveBeenCalledWith("session-2");
  });
});
