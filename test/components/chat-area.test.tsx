import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionMessagesPOST: vi.fn(),
  SessionPOST: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { ChatArea } from "../../src/components/chat-area/ChatArea";
import { useChat } from "../../src/hooks/use-chat";

// abortError 创建可被 ChatArea 识别的用户取消错误。
function abortError(): DOMException {
  return new DOMException("已停止生成", "AbortError");
}

function ChatAreaHarness() {
  return <ChatArea chat={useChat()} />;
}

describe("ChatArea", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    tongjiStudentService.SessionPOST.mockReset();
    tongjiStudentService.SessionPOST.mockResolvedValue({ session_id: "session-1", persistence: "ephemeral" });
    tongjiStudentService.SessionMessagesPOST.mockReset();
  });

  it("应从文本输入创建问题，并将 Agent 工作过程和最终回答分开呈现", async () => {
    const user = userEvent.setup();
    mockSseEvents([
      { type: "reasoning", text: "先检索新生指南" },
      { type: "tool_started", id: "knowledge", label: "检索校园知识库" },
      { type: "delta", text: "请携带录取通知书。" },
      { type: "completed" },
    ]);

    render(<ChatAreaHarness />);

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
    mockSseEvents([
      { type: "reasoning", text: "## 检索计划" },
      {
        type: "delta",
        text: "## 报到材料\n\n| 项目 | 内容 |\n| --- | --- |\n| 材料 | 录取通知书 |",
      },
      { type: "completed" },
    ]);

    render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "需要哪些材料？");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(
      await screen.findByRole("heading", { name: "报到材料", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "录取通知书" })).toBeInTheDocument();

    await user.click(screen.getByText(/已工作/));
    expect(
      screen.getByRole("heading", { name: "检索计划", level: 2 }),
    ).toBeInTheDocument();
  });

  it("应支持 GFM 扩展、单换行与数学公式", async () => {
    const user = userEvent.setup();
    mockSseEvents([
      {
        type: "delta",
        text: "~~已完成~~\n- [x] 校验通过\n访问 https://example.com\n公式 $E=mc^2$",
      },
      { type: "completed" },
    ]);

    const { container } = render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "测试扩展语法");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect((await screen.findByText("已完成")).closest("del")).not.toBeNull();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".markdown-content br")).not.toBeNull();
  });

  it("应使用语法高亮器渲染代码块，同时保留行内代码", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mockSseEvents([
      {
        type: "delta",
        text: "行内 `session_id`。\n\n```ts\nconst sessionId = 'session-1';\n```",
      },
      { type: "completed" },
    ]);

    const { container } = render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "测试代码块");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(await screen.findByText("session_id")).toBeInTheDocument();
    expect(container.querySelector(".markdown-code-block")).toHaveTextContent(
      "const sessionId = 'session-1';",
    );
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "复制代码" }));
    expect(writeText).toHaveBeenCalledWith("const sessionId = 'session-1';");
    expect(screen.getByRole("button", { name: "已复制代码" })).toBeInTheDocument();
  });

  it("应复制问题和回答，并为它们展示发送时间", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mockSseEvents([
      { type: "delta", text: "这是测试回答。" },
      { type: "completed" },
    ]);

    const { container } = render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "这是测试问题。");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(await screen.findByText("这是测试回答。")).toBeInTheDocument();
    const timestamps = container.querySelectorAll("time");
    expect(timestamps).toHaveLength(2);
    expect([...timestamps].map(({ dateTime }) => dateTime)).toEqual([
      expect.any(String),
      expect.any(String),
    ]);

    await user.click(screen.getByRole("button", { name: "复制问题" }));
    expect(writeText).toHaveBeenLastCalledWith("这是测试问题。");
    expect(screen.getByRole("button", { name: "已复制问题" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复制回答" }));
    expect(writeText).toHaveBeenLastCalledWith("这是测试回答。");
    expect(screen.getByRole("button", { name: "已复制回答" })).toBeInTheDocument();
  });

  it("应在 Clipboard API 失败时回退到选择复制", async () => {
    const user = userEvent.setup();
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("clipboard unavailable")) },
    });
    mockSseEvents([
      { type: "delta", text: "用于回退复制的回答。" },
      { type: "completed" },
    ]);

    render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "用于回退复制的问题。");
    await user.click(screen.getByRole("button", { name: "发送问题" }));
    await screen.findByText("用于回退复制的回答。");
    await user.click(screen.getByRole("button", { name: "复制问题" }));

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: "已复制问题" })).toBeInTheDocument();
  });

  it("应在发送和流式更新时滚动到输入框上方的对话末尾", async () => {
    const user = userEvent.setup();
    mockSseEvents([
      { type: "delta", text: "正在生成回答" },
      { type: "completed" },
    ]);

    render(<ChatAreaHarness />);
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
    tongjiStudentService.SessionMessagesPOST.mockImplementation(
      async (_request: unknown, options: StreamOptions) => {
        createSseEmitter(options)({
          type: "status",
          label: "正在理解问题",
          detail: "整理信息",
        });
        await new Promise<void>((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(abortError()), { once: true });
        });
      },
    );

    render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "校园卡应该在哪里办理？");
    await user.click(screen.getByRole("button", { name: "发送问题" }));
    await user.click(await screen.findByRole("button", { name: "停止生成" }));

    expect(await screen.findByText("本轮回答已停止。")).toBeInTheDocument();
    expect(screen.queryByText("不应出现的后续内容")).not.toBeInTheDocument();
  });

  it("应使用通用文案展示流式失败，不能泄漏服务端详情", async () => {
    const user = userEvent.setup();
    mockSseEvents([{ type: "failed" }]);

    render(<ChatAreaHarness />);

    await user.type(screen.getByLabelText("输入校园问题"), "查询校园卡");
    await user.click(screen.getByRole("button", { name: "发送问题" }));

    expect(await screen.findByText("生成失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.queryByText("数据库连接串校验失败")).not.toBeInTheDocument();
  });

  it("应在模型请求频率受限时每隔 3 秒自动重试，三次后展示专用提示", async () => {
    vi.useFakeTimers();
    mockSseEvents([{ type: "failed", statusCode: 429 }]);

    render(<ChatAreaHarness />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("输入校园问题"), {
        target: { value: "查询校园卡" },
      });
      fireEvent.click(screen.getByRole("button", { name: "发送问题" }));
      await Promise.resolve();
    });

    for (let retry = 1; retry <= 3; retry += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });
      expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledTimes(
        retry + 1,
      );
    }

    expect(
      screen.getByText("模型请求次数超限，请稍后重试。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("生成失败，请稍后重试。")).not.toBeInTheDocument();
  });

  it("应在频率受限的重试等待期间停止生成", async () => {
    vi.useFakeTimers();
    mockSseEvents([{ type: "failed", statusCode: 429 }]);

    render(<ChatAreaHarness />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("输入校园问题"), {
        target: { value: "查询校园卡" },
      });
      fireEvent.click(screen.getByRole("button", { name: "发送问题" }));
      await Promise.resolve();
    });

    expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "停止生成" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(tongjiStudentService.SessionMessagesPOST).toHaveBeenCalledTimes(1);
    expect(screen.getByText("本轮回答已停止。")).toBeInTheDocument();
  });

  it("应从发送开始实时计时，并以 run.completed 的最终耗时定格", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00Z"));
    let completeStream: (() => void) | undefined;
    tongjiStudentService.SessionMessagesPOST.mockImplementation(
      async (_request: unknown, options: StreamOptions) => {
        const emit = createSseEmitter(options);
        emit({ type: "status", label: "正在理解问题" });
        await new Promise<void>((resolve) => {
          completeStream = resolve;
          options.signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        if (options.signal?.aborted) {
          return;
        }
        emit({ type: "completed", durationMs: 61_000 });
      },
    );

    render(<ChatAreaHarness />);

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
  });
});

type TestStreamEvent =
  | { type: "status"; label: string; detail?: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_started"; id: string; label: string }
  | { type: "delta"; text: string }
  | { type: "completed"; durationMs?: number }
  | { type: "failed"; statusCode?: number };

type StreamOptions = {
  onDownloadProgress?: (progress: { event: { target: { responseText: string } } }) => void;
  signal?: AbortSignal;
};

function mockSseEvents(events: TestStreamEvent[]): void {
  tongjiStudentService.SessionMessagesPOST.mockImplementation(
    async (_request: unknown, options: StreamOptions) => {
      const emit = createSseEmitter(options);
      for (const event of events) {
        emit(event);
      }
    },
  );
}

function createSseEmitter(options: StreamOptions): (event: TestStreamEvent) => void {
  let responseText = "";

  return (event) => {
    responseText += `data: ${JSON.stringify(toServerEvent(event))}\n\n`;
    options.onDownloadProgress?.({ event: { target: { responseText } } });
  };
}

function toServerEvent(event: TestStreamEvent): { type: string; data: Record<string, unknown> } {
  switch (event.type) {
    case "status":
      return { type: "agent.status", data: { label: event.label, detail: event.detail } };
    case "reasoning":
      return { type: "assistant.reasoning", data: { text: event.text } };
    case "tool_started":
      return { type: "tool.call.started", data: { id: event.id, label: event.label } };
    case "delta":
      return { type: "assistant.delta", data: { text: event.text } };
    case "completed":
      return { type: "run.completed", data: { duration_ms: event.durationMs } };
    case "failed":
      return { type: "run.failed", data: { status_code: event.statusCode } };
  }
}
