import { describe, expect, it } from "@jest/globals";
import { parseRealtimeEvent } from "@/src/data/realtime/RealtimeEvent";

describe("parseRealtimeEvent", () => {
  it("parses a valid event envelope", () => {
    expect(
      parseRealtimeEvent({
        sequence: "42",
        id: "event-id",
        type: "inbox.request.created",
        payload: {
          requestType: "member_link",
        },
        occurredAt: "2026-09-14T00:00:00Z",
      }),
    ).toEqual({
      sequence: "42",
      id: "event-id",
      type: "inbox.request.created",
      payload: {
        requestType: "member_link",
      },
      occurredAt: "2026-09-14T00:00:00Z",
    });
  });

  it("rejects malformed payloads", () => {
    expect(() =>
      parseRealtimeEvent({
        sequence: "42",
        id: "event-id",
        type: "inbox.request.created",
        payload: null,
        occurredAt: "2026-09-14T00:00:00Z",
      }),
    ).toThrow("invalid realtime payload");
  });
});
