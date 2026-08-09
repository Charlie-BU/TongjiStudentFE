import type { KeyboardEvent } from "react";
import {
  ArrowUpOutlined,
  PaperClipOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Input } from "antd";
import "./ChatInput.css";

const { TextArea } = Input;

// ChatInputProps 定义聊天输入组件所需的受控状态与操作。
type ChatInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
};

// reservedButtonClick 为后续的提及和附件能力预留点击入口。
const reservedButtonClick = (): void => undefined;

// ChatInput 提供消息输入、预留工具入口及发送控制。
export function ChatInput({
  value,
  disabled,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  // handleInputKeyDown 支持 Enter 发送、Shift+Enter 换行。
  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <footer className="chat-input-panel">
      <Card size="small" className="chat-input-card">
        <TextArea
          aria-label="输入校园问题"
          autoSize={{ minRows: 2, maxRows: 5 }}
          className="chat-input-textarea"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="今天有什么可以帮你？"
          value={value}
          variant="borderless"
        />
        <div className="chat-input-toolbar">
          <div className="chat-input-tools">
            <Button
              aria-label="提及内容"
              className="chat-input-tool-button"
              color="default"
              icon={<UserOutlined />}
              onClick={reservedButtonClick}
              shape="circle"
              variant="outlined"
            />
            <Button
              aria-label="添加附件"
              className="chat-input-tool-button"
              color="default"
              icon={<PaperClipOutlined />}
              onClick={reservedButtonClick}
              shape="circle"
              variant="outlined"
            />
          </div>
          {disabled ? (
            <Button
              aria-label="停止生成"
              className="chat-input-stop-button"
              color="default"
              onClick={onStop}
              shape="circle"
              variant="solid"
            >
              <span className="chat-input-stop-icon" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              aria-label="发送问题"
              className="chat-input-send-button"
              disabled={!value.trim()}
              icon={<ArrowUpOutlined />}
              onClick={onSubmit}
              shape="circle"
              variant="solid"
            />
          )}
        </div>
      </Card>
    </footer>
  );
}
