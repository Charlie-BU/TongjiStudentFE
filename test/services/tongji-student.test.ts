import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosRequest = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: { request: axiosRequest },
}));

import { tongjiStudentService } from "../../src/services/tongji-student";

describe("tongjiStudentService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    axiosRequest.mockReset();
    axiosRequest.mockResolvedValue({ data: { session_id: "test-session" } });
  });

  it("应从 localStorage 读取 Token 并附加 Bearer Authorization 请求头", async () => {
    window.localStorage.setItem("tongji-access-token", "test-access-token");

    await tongjiStudentService.SessionPOST({});

    expect(axiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      }),
    );
  });
});
