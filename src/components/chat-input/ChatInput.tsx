import { useState, type KeyboardEvent } from "react";
import type { ModelTier } from "../../hooks/use-chat";
import {
  ArrowUpOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { IconDown } from "@arco-design/web-react/icon";
import { Button, Card, Dropdown, Input } from "antd";
import "./ChatInput.css";

const { TextArea } = Input;

// ChatInputProps 定义聊天输入组件所需的受控状态与操作。
type ChatInputProps = {
  modelTier: ModelTier;
  onModelTierChange: (tier: ModelTier) => void;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
};

const modelTiers = ["lite", "pro", "max"] as const;
const modelTierLabels: Record<ModelTier, string> = { lite: "Lite", pro: "Pro", max: "Max" };

// ChatInput 提供消息输入、模型档位选择及发送控制。
export function ChatInput({
  modelTier,
  onModelTierChange,
  value,
  disabled,
  onChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
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
            <Dropdown
              autoFocus
              disabled={disabled}
              open={!disabled && modelMenuOpen}
              onOpenChange={setModelMenuOpen}
              placement="topLeft"
              trigger={["click"]}
              classNames={{ root: "chat-model-dropdown" }}
              menu={{
                selectable: true,
                selectedKeys: [modelTier],
                items: modelTiers.map((tier) => ({
                  key: tier,
                  label: (
                    <span className="chat-model-option">
                      <span>{modelTierLabels[tier]}</span>
                      {modelTier === tier && <CheckOutlined aria-hidden="true" />}
                    </span>
                  ),
                })),
                onClick: ({ key }) => {
                  if (key === "lite" || key === "pro" || key === "max") {
                    onModelTierChange(key);
                  }
                  setModelMenuOpen(false);
                },
              }}
            >
              <Button
                aria-label={`模型档位：${modelTierLabels[modelTier]}`}
                aria-haspopup="menu"
                aria-expanded={!disabled && modelMenuOpen}
                className="chat-model-button"
                disabled={disabled}
                variant="text"
                color="default"
              >
                {modelTierLabels[modelTier]}
                <IconDown className="chat-model-chevron" aria-hidden="true" />
              </Button>
            </Dropdown>
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
