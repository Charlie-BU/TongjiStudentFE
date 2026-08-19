import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionDeleteDELETE: vi.fn(),
  SessionGET: vi.fn(),
  SessionRenamePOST: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { SessionSidebar } from "../../src/components/session-sidebar/SessionSidebar";

const userBasicInfo = {
  name: "测试同学",
  userId: "test-student-001",
  userTypeName: "本科生",
};

describe("SessionSidebar", () => {
  beforeEach(() => {
    tongjiStudentService.SessionDeleteDELETE.mockReset();
    tongjiStudentService.SessionGET.mockReset();
    tongjiStudentService.SessionRenamePOST.mockReset();
  });

  it("应按最近活跃时间倒序展示服务端会话", async () => {
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "older", name: "较早会话", last_active_at: "2026-08-09T10:00:00Z" },
        { id: "newer", name: "最新会话", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });

    const { container } = render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={vi.fn()} selectedSessionId={null} userBasicInfo={userBasicInfo} />);

    await screen.findByText("最新会话");
    const sessions = [...container.querySelectorAll(".session-list > .session-list-row")];
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

    render(<SessionSidebar createdSessions={[]} onNewChat={onNewChat} onSessionSelect={vi.fn()} selectedSessionId={null} userBasicInfo={userBasicInfo} />);

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

    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={onSessionSelect} selectedSessionId={null} userBasicInfo={userBasicInfo} />);

    await user.click(await screen.findByRole("button", { name: "校园卡咨询" }));
    expect(onSessionSelect).toHaveBeenCalledWith("session-2");
  });

  it("应通过三点菜单重命名会话", async () => {
    const user = userEvent.setup();
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "session-3", name: "原会话名", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });
    tongjiStudentService.SessionRenamePOST.mockResolvedValue({ name: "新会话名" });
    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={vi.fn()} selectedSessionId={null} userBasicInfo={userBasicInfo} />);

    await user.click(await screen.findByRole("button", { name: "操作会话 原会话名" }));
    await user.click(await screen.findByText("重命名"));
    const renameInput = screen.getByRole("textbox", { name: "重命名 原会话名" });
    await user.clear(renameInput);
    await user.type(renameInput, "新会话名");
    await user.keyboard("{Enter}");

    expect(tongjiStudentService.SessionRenamePOST).toHaveBeenCalledWith({
      name: "新会话名",
      session_id: "session-3",
    });
    expect(await screen.findByText("新会话名")).toBeInTheDocument();
  });

  it("应禁用正在生成会话的删除操作", async () => {
    const user = userEvent.setup();
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "session-4", name: "生成中的会话", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });

    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionSelect={vi.fn()} selectedSessionId="session-4" streamingSessionId="session-4" userBasicInfo={userBasicInfo} />);

    await user.click(await screen.findByRole("button", { name: "操作会话 生成中的会话" }));
    const deleteItem = (await screen.findByText("删除会话")).closest('[role="menuitem"]');
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
    expect(deleteItem).toHaveAttribute("title", "正在工作中，请等待工作完成后删除");
    await user.click(deleteItem!);
    expect(tongjiStudentService.SessionDeleteDELETE).not.toHaveBeenCalled();
  });

  it("应在生成期间禁用新会话和其他会话切换", async () => {
    const user = userEvent.setup();
    const onNewChat = vi.fn();
    const onSessionSelect = vi.fn();
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "session-current", name: "当前会话", last_active_at: "2026-08-10T10:00:00Z" },
        { id: "session-other", name: "其他会话", last_active_at: "2026-08-09T10:00:00Z" },
      ],
    });

    render(
      <SessionSidebar
        createdSessions={[]}
        onNewChat={onNewChat}
        onSessionSelect={onSessionSelect}
        selectedSessionId="session-current"
        streamingSessionId="session-current"
        userBasicInfo={userBasicInfo}
      />,
    );

    const newChatButton = screen.getByRole("button", { name: "New Chat" });
    const otherSessionButton = await screen.findByRole("button", { name: "其他会话" });
    expect(newChatButton).toBeDisabled();
    expect(otherSessionButton).toBeDisabled();

    await user.click(newChatButton);
    await user.click(otherSessionButton);
    expect(onNewChat).not.toHaveBeenCalled();
    expect(onSessionSelect).not.toHaveBeenCalled();

    await user.hover(otherSessionButton.parentElement!);
    expect(await screen.findByText("当前会话正在工作中，请等待完成后再切换")).toBeInTheDocument();
  });

  it("应隐藏匿名会话的重命名和删除菜单", async () => {
    const user = userEvent.setup();
    const onSessionSelect = vi.fn();
    render(
      <SessionSidebar
        createdSessions={[{ id: "anon-001", lastActiveAt: "2026-08-10T10:00:00Z", name: "匿名会话" }]}
        onNewChat={vi.fn()}
        onSessionSelect={onSessionSelect}
        selectedSessionId={null}
      />,
    );

    const sessionButton = await screen.findByRole("button", { name: "匿名会话" });
    await user.click(sessionButton);
    expect(onSessionSelect).toHaveBeenCalledWith("anon-001");

    fireEvent.contextMenu(sessionButton);

    expect(screen.queryByText("重命名")).not.toBeInTheDocument();
    expect(screen.queryByText("删除")).not.toBeInTheDocument();
  });

  it("应在确认后删除会话", async () => {
    const user = userEvent.setup();
    const onSessionDeleted = vi.fn();
    tongjiStudentService.SessionDeleteDELETE.mockResolvedValue({});
    tongjiStudentService.SessionGET.mockResolvedValue({
      sessions: [
        { id: "session-5", name: "待删除会话", last_active_at: "2026-08-10T10:00:00Z" },
      ],
    });

    render(<SessionSidebar createdSessions={[]} onNewChat={vi.fn()} onSessionDeleted={onSessionDeleted} onSessionSelect={vi.fn()} selectedSessionId={null} userBasicInfo={userBasicInfo} />);

    await user.click(await screen.findByRole("button", { name: "操作会话 待删除会话" }));
    await user.click(await screen.findByText("删除会话"));
    expect((await screen.findAllByText("确认删除会话？")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /^删\s*除$/ }));

    expect(tongjiStudentService.SessionDeleteDELETE).toHaveBeenCalledWith({
      Authorization: "",
      session_id: "session-5",
    });
    expect(onSessionDeleted).toHaveBeenCalledWith("session-5");
    expect(screen.queryByText("待删除会话")).not.toBeInTheDocument();
  });

  it("应在未获取用户信息时发起同济统一认证", async () => {
    const user = userEvent.setup();
    const onOauthRedirect = vi.fn();
    tongjiStudentService.SessionGET.mockResolvedValue({ sessions: [] });

    render(
      <SessionSidebar
        createdSessions={[]}
        onNewChat={vi.fn()}
        onOauthRedirect={onOauthRedirect}
        onSessionSelect={vi.fn()}
        selectedSessionId={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "同济统一身份认证登录" }));
    expect(onOauthRedirect).toHaveBeenCalledWith("/api/v1/tongji/oauth/authorize");
    expect(tongjiStudentService.SessionGET).not.toHaveBeenCalled();
  });

  it("应向上展示用户菜单并支持切换用户和退出登录", async () => {
    const user = userEvent.setup();
    const onOauthRedirect = vi.fn();
    const onPageReload = vi.fn();
    tongjiStudentService.SessionGET.mockResolvedValue({ sessions: [] });
    window.localStorage.setItem("tongji-access-token", "test-access-token");

    render(
      <SessionSidebar
        createdSessions={[]}
        onNewChat={vi.fn()}
        onOauthRedirect={onOauthRedirect}
        onPageReload={onPageReload}
        onSessionSelect={vi.fn()}
        selectedSessionId={null}
        userBasicInfo={{ name: "测试同学", userId: "test-student-001", userTypeName: "本科生" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "用户菜单" }));
    await user.click(await screen.findByText("切换用户"));
    expect(onOauthRedirect).toHaveBeenCalledWith("/api/v1/tongji/oauth/authorize");
    expect(document.querySelector(".ant-dropdown-placement-topLeft")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "用户菜单" }));
    await user.click(await screen.findByText("退出登录"));
    expect(window.localStorage.getItem("tongji-access-token")).toBeNull();
    expect(onPageReload).toHaveBeenCalledOnce();
  });
});
