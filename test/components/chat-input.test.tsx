import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "../../src/components/chat-input/ChatInput";

// ControlledChatInput 为输入组件提供与生产环境一致的受控值。
function ControlledChatInput({
  disabled = false,
  onStop = vi.fn(),
  onSubmit = vi.fn(),
}: {
  disabled?: boolean;
  onStop?: () => void;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <ChatInput
      disabled={disabled}
      onChange={setValue}
      onStop={onStop}
      onSubmit={onSubmit}
      value={value}
    />
  );
}

describe("ChatInput", () => {
  it("应在输入内容后启用发送，并支持点击和 Enter 提交", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ControlledChatInput onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText("输入校园问题");
    const sendButton = screen.getByRole("button", { name: "发送问题" });
    expect(sendButton).toBeDisabled();

    await user.type(textarea, "校园卡办理");
    expect(sendButton).toBeEnabled();

    await user.click(sendButton);
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("应在 Shift+Enter 或中文输入法组合阶段保留输入，不提交", () => {
    const onSubmit = vi.fn();

    render(<ControlledChatInput onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText("输入校园问题");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("应在流式状态禁用输入并触发停止回调", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();

    render(<ControlledChatInput disabled onStop={onStop} />);

    expect(screen.getByLabelText("输入校园问题")).toBeDisabled();
    expect(screen.getByRole("button", { name: "提及内容" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加附件" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "停止生成" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
