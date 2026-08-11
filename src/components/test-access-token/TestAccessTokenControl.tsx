import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { KeyOutlined } from "@ant-design/icons";
import { Button, Input, Modal } from "antd";
import "./TestAccessTokenControl.css";

const TONGJI_ACCESS_TOKEN_KEY = "tongji-access-token";

type TestAccessTokenControlProps = {
  onSaved?: () => void;
};

function reloadPage(): void {
  window.location.reload();
}

// TestAccessTokenControl 仅在测试环境提供手动设置同济 Access Token 的入口。
export function TestAccessTokenControl({ onSaved = reloadPage }: TestAccessTokenControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState("");
  const [position, setPosition] = useState<CSSProperties>();
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
    wasDragged: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const openModal = (): void => {
    setToken(window.localStorage.getItem(TONGJI_ACCESS_TOKEN_KEY) ?? "");
    setIsOpen(true);
  };

  const saveToken = (): void => {
    window.localStorage.setItem(TONGJI_ACCESS_TOKEN_KEY, token.trim());
    onSaved();
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      pointerId: event.pointerId,
      wasDragged: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    drag.wasDragged ||= Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0;
    setPosition({
      bottom: "auto",
      left: Math.min(Math.max(event.clientX - drag.offsetX, 0), window.innerWidth - bounds.width),
      right: "auto",
      top: Math.min(Math.max(event.clientY - drag.offsetY, 0), window.innerHeight - bounds.height),
    });
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    suppressClickRef.current = drag.wasDragged;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <>
      <Button
        aria-label="配置测试 Tongji Access Token"
        className="test-access-token-trigger"
        icon={<KeyOutlined />}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          openModal();
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        shape="circle"
        style={position}
        type="primary"
      />
      <Modal
        cancelText="取消"
        onCancel={() => setIsOpen(false)}
        onOk={saveToken}
        okText="保存"
        open={isOpen}
        title="Tongji Access Token"
      >
        <Input.Password
          aria-label="输入 Tongji Access Token"
          autoComplete="off"
          onChange={(event) => setToken(event.target.value)}
          placeholder="请输入 Tongji Access Token"
          value={token}
        />
      </Modal>
    </>
  );
}
