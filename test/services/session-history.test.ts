import { describe, expect, it, vi } from "vitest";

const tongjiStudentService = vi.hoisted(() => ({
  SessionMessagesGET: vi.fn(),
}));

vi.mock("../../src/services/tongji-student", () => ({ tongjiStudentService }));

import { fetchSessionHistory } from "../../src/services/session-history";

describe("fetchSessionHistory", () => {
  it("应携带首页快照读取后续页，并按 sequence 合并消息", async () => {
    tongjiStudentService.SessionMessagesGET
      .mockResolvedValueOnce({
        messages: [{ id: "msg-51", sequence: 51 }],
        has_more: true,
        snapshot_sequence: 151,
      })
      .mockResolvedValueOnce({
        messages: [{ id: "msg-101", sequence: 101 }],
        has_more: true,
        snapshot_sequence: 151,
      })
      .mockResolvedValueOnce({
        messages: [{ id: "msg-1", sequence: 1 }],
        has_more: true,
        snapshot_sequence: 151,
      })
      .mockResolvedValueOnce({
        messages: [{ id: "msg-151", sequence: 151 }],
        has_more: false,
        snapshot_sequence: 151,
      });

    const history = await fetchSessionHistory("session-1");

    expect(tongjiStudentService.SessionMessagesGET).toHaveBeenNthCalledWith(1, {
      limit: 50,
      offset: 0,
      session_id: "session-1",
    });
    expect(tongjiStudentService.SessionMessagesGET).toHaveBeenCalledWith({
      limit: 50,
      offset: 50,
      session_id: "session-1",
      snapshot_sequence: 151,
    });
    expect(history.snapshotSequence).toBe(151);
    expect(history.messages.map((message) => message.sequence)).toEqual([1, 51, 101, 151]);
  });
});
