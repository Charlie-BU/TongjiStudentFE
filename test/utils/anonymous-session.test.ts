import { beforeEach, describe, expect, it } from "vitest";
import {
  addAnonymousSession,
  getAnonymousSessions,
  updateAnonymousSessionLastActiveAt,
} from "../../src/utils/anonymous-session";

describe("anonymous-session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("应保存会话并按最近活跃时间倒序读取", () => {
    addAnonymousSession({ id: "older", lastActiveAt: "2026-08-10T10:00:00.000Z", name: "较早会话" });
    addAnonymousSession({ id: "newer", lastActiveAt: "2026-08-11T10:00:00.000Z", name: "最新会话" });

    expect(getAnonymousSessions().map((session) => session.id)).toEqual(["newer", "older"]);
  });

  it("应更新既有匿名会话的活跃时间并重新排序", () => {
    addAnonymousSession({ id: "current", lastActiveAt: "2026-08-10T10:00:00.000Z", name: "当前会话" });
    addAnonymousSession({ id: "newer", lastActiveAt: "2026-08-11T10:00:00.000Z", name: "较新会话" });

    updateAnonymousSessionLastActiveAt("current");

    const sessions = getAnonymousSessions();
    expect(sessions[0]?.id).toBe("current");
    expect(Date.parse(sessions[0]?.lastActiveAt ?? "")).toBeGreaterThan(
      Date.parse("2026-08-11T10:00:00.000Z"),
    );
  });
});
