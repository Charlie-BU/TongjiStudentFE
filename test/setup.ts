import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ResizeObserverStub 为 antd 的尺寸监听提供最小 jsdom 实现。
class ResizeObserverStub {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
});
