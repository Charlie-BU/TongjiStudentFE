import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const streamMockReply = vi.hoisted(() => vi.fn());

vi.mock("../../src/components/chat-area/mock-stream", () => ({
  streamMockReply,
}));

import { ChatArea } from "../../src/components/chat-area/ChatArea";

// abortError 创建可被 ChatArea 识别的用户取消错误。
function abortError(): DOMException {
  return new DOMException("已停止生成", "AbortError");
}

describe("ChatArea", () => {
  beforeEach(() => {
    streamMockReply.mockReset();
  });

  it("应展示欢迎建议，并将 Agent 工作过程和最终回答分开呈现", async () => {
    const user = userEvent.setup();
    streamMockReply.mockImplementation(async function* () {
      yield { type: "reasoning", text: "先检索新生指南" };
      yield { type: "tool_started", id: "knowledge", label: "检索校园知识库" };
      yield { type: "delta", text: "请携带录取通知书。" };
      yield { type: "completed" };
    });

    render(<ChatArea />);

    await user.click(screen.getByRole("button", { name: "新生报到需要准备哪些材料？" }));

    expect(await screen.findByText("请携带录取通知书。")).toBeInTheDocument();
    expect(screen.getByText("新生报到需要准备哪些材料？")).toBeInTheDocument();

    await user.click(screen.getByText("查看工作过程"));
    expect(screen.getByText("Agent 说明")).toBeInTheDocument();
    expect(screen.getByText("先检索新生指南")).toBeInTheDocument();
    expect(screen.getByText("检索校园知识库")).toBeInTheDocument();
  });

  it("应在停止生成后展示中止结果，并忽略后续流事件", async () => {
    const user = userEvent.setup();
    streamMockReply.mockImplementation(async function* (_question: string, signal: AbortSignal) {
      yield { type: "status", label: "正在理解问题", detail: "整理信息" };
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(abortError()), { once: true });
      });
      yield { type: "delta", text: "不应出现的后续内容" };
    });

    render(<ChatArea />);

    await user.click(screen.getByRole("button", { name: "校园卡应该在哪里办理？" }));
    await user.click(await screen.findByRole("button", { name: "停止生成" }));

    expect(await screen.findByText("本轮回答已停止。")).toBeInTheDocument();
    expect(screen.queryByText("不应出现的后续内容")).not.toBeInTheDocument();
  });
});
