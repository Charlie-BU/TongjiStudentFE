import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const chatGateway = vi.hoisted(() => ({
  createSession: vi.fn(),
  streamMessage: vi.fn(),
}));

import { ChatArea } from "../../src/components/chat-area/ChatArea";

// abortError 创建可被 ChatArea 识别的用户取消错误。
function abortError(): DOMException {
  return new DOMException("已停止生成", "AbortError");
}

describe("ChatArea", () => {
  beforeEach(() => {
    chatGateway.createSession.mockReset();
    chatGateway.createSession.mockResolvedValue({ id: "session-1", persistence: "ephemeral" });
    chatGateway.streamMessage.mockReset();
  });

  it("应从文本输入创建问题，并将 Agent 工作过程和最终回答分开呈现", async () => {
    const user = userEvent.setup();
    chatGateway.streamMessage.mockImplementation(async function* () {
      yield { type: "reasoning", text: "先检索新生指南" };
      yield { type: "tool_started", id: "knowledge", label: "检索校园知识库" };
      yield { type: "delta", text: "请携带录取通知书。" };
      yield { type: "completed" };
    });

    render(<ChatArea chatGateway={chatGateway} />);

    await user.type(screen.getByLabelText("输入校园问题"), "新生报到需要准备哪些材料？");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(await screen.findByText("请携带录取通知书。")).toBeInTheDocument();
    expect(screen.getByText("新生报到需要准备哪些材料？")).toBeInTheDocument();

    await user.click(screen.getByText(/已工作/));
    expect(screen.getByText("先检索新生指南")).toBeInTheDocument();
    expect(screen.getByText("检索校园知识库")).toBeInTheDocument();
  });

  it("应将最终回答和工作过程渲染为 Markdown", async () => {
    const user = userEvent.setup();
    chatGateway.streamMessage.mockImplementation(async function* () {
      yield { type: "reasoning", text: "## 检索计划" };
      yield { type: "delta", text: "## 报到材料\n\n- 录取通知书" };
      yield { type: "completed" };
    });

    render(<ChatArea chatGateway={chatGateway} />);

    await user.type(screen.getByLabelText("输入校园问题"), "需要哪些材料？");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(
      await screen.findByRole("heading", { name: "报到材料", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("录取通知书")).toBeInTheDocument();

    await user.click(screen.getByText(/已工作/));
    expect(
      screen.getByRole("heading", { name: "检索计划", level: 2 }),
    ).toBeInTheDocument();
  });

  it("应在发送和流式更新时滚动到输入框上方的对话末尾", async () => {
    const user = userEvent.setup();
    chatGateway.streamMessage.mockImplementation(async function* () {
      yield { type: "delta", text: "正在生成回答" };
      yield { type: "completed" };
    });

    render(<ChatArea chatGateway={chatGateway} />);
    vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();

    await user.type(screen.getByLabelText("输入校园问题"), "你好");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    await waitFor(() => {
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "end",
      });
    });
  });

  it("应在停止生成后展示中止结果，并忽略后续流事件", async () => {
    const user = userEvent.setup();
    chatGateway.streamMessage.mockImplementation(async function* ({ signal }: { signal: AbortSignal }) {
      yield { type: "status", label: "正在理解问题", detail: "整理信息" };
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(abortError()), { once: true });
      });
      yield { type: "delta", text: "不应出现的后续内容" };
    });

    render(<ChatArea chatGateway={chatGateway} />);

    await user.type(screen.getByLabelText("输入校园问题"), "校园卡应该在哪里办理？");
    await user.click(screen.getByRole("button", { name: "发送问题" }));
    await user.click(await screen.findByRole("button", { name: "停止生成" }));

    expect(await screen.findByText("本轮回答已停止。")).toBeInTheDocument();
    expect(screen.queryByText("不应出现的后续内容")).not.toBeInTheDocument();
  });

  it("应使用通用文案展示流式失败，不能泄漏服务端详情", async () => {
    const user = userEvent.setup();
    chatGateway.streamMessage.mockImplementation(async function* () {
      yield { type: "failed", message: "数据库连接串校验失败" };
    });

    render(<ChatArea chatGateway={chatGateway} />);

    await user.type(screen.getByLabelText("输入校园问题"), "查询校园卡");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(await screen.findByText("生成失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.queryByText("数据库连接串校验失败")).not.toBeInTheDocument();
  });

  it("应从发送开始实时计时，并以 run.completed 的最终耗时定格", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00Z"));
    let completeStream: (() => void) | undefined;
    chatGateway.streamMessage.mockImplementation(async function* ({ signal }: { signal: AbortSignal }) {
      yield { type: "status", label: "正在理解问题" };
      await new Promise<void>((resolve) => {
        completeStream = resolve;
        signal.addEventListener("abort", () => resolve(), { once: true });
      });
      if (signal.aborted) {
        return;
      }
      yield { type: "completed", durationMs: 61_000 };
    });

    render(<ChatArea chatGateway={chatGateway} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("输入校园问题"), {
        target: { value: "你好" },
      });
      fireEvent.click(screen.getByRole("button", { name: "发送问题" }));
      await Promise.resolve();
    });
    expect(screen.getByText("已工作 0 秒")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByText("已工作 2 秒")).toBeInTheDocument();

    await act(async () => {
      completeStream?.();
      await Promise.resolve();
    });
    expect(screen.getByText("已工作 1 分")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
