import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  TongjiOauthTokenPOST: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { OauthCallback } from "../../src/components/oauth-callback/OauthCallback";

describe("OauthCallback", () => {
  beforeEach(() => {
    window.localStorage.clear();
    tongjiStudentService.TongjiOauthTokenPOST.mockReset();
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("应使用 code/state 换取 Token、清理回调参数并返回应用", async () => {
    const onComplete = vi.fn();
    window.history.replaceState(null, "", "/oauth/callback?code=test-code&state=test-state");
    tongjiStudentService.TongjiOauthTokenPOST.mockResolvedValue({ access_token: "test-access-token" });

    render(<OauthCallback onComplete={onComplete} />);

    await waitFor(() => {
      expect(tongjiStudentService.TongjiOauthTokenPOST).toHaveBeenCalledWith({
        code: "test-code",
        state: "test-state",
      });
    });
    expect(window.localStorage.getItem("tongji-access-token")).toBe("test-access-token");
    expect(window.location.pathname).toBe("/oauth/callback");
    expect(window.location.search).toBe("");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("应在回调参数缺失时阻止换取 Token", async () => {
    const onFail = vi.fn();
    window.history.replaceState(null, "", "/oauth/callback?code=test-code");

    render(<OauthCallback onFail={onFail} />);

    expect(await screen.findByText("登录回调参数缺失，请重新发起认证。")).toBeInTheDocument();
    expect(tongjiStudentService.TongjiOauthTokenPOST).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledOnce();
  });

  it("应在换取 Token 失败时显示可见错误且不保存 Token", async () => {
    const onFail = vi.fn();
    window.history.replaceState(null, "", "/oauth/callback?code=test-code&state=test-state");
    tongjiStudentService.TongjiOauthTokenPOST.mockRejectedValue(new Error("test failure"));

    render(<OauthCallback onFail={onFail} />);

    expect(await screen.findByText("登录失败，请重新发起认证。")).toBeInTheDocument();
    expect(window.localStorage.getItem("tongji-access-token")).toBeNull();
    expect(onFail).toHaveBeenCalledOnce();
  });

  it("应在 StrictMode 中只消费一次授权码并由第二次 effect 接收结果", async () => {
    const onComplete = vi.fn();
    window.history.replaceState(null, "", "/oauth/callback?code=test-code&state=test-state");
    tongjiStudentService.TongjiOauthTokenPOST.mockResolvedValue({ access_token: "test-access-token" });

    render(
      <StrictMode>
        <OauthCallback onComplete={onComplete} />
      </StrictMode>,
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(tongjiStudentService.TongjiOauthTokenPOST).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("tongji-access-token")).toBe("test-access-token");
  });
});
