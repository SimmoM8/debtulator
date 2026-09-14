import { describe, expect, it } from "@jest/globals";
import { parseRealtimeEventBatch } from "@/src/data/realtime/RealtimeEventBatch";

describe("parseRealtimeEventBatch", () => {
  it("parses a valid event page", () => {
    expect(
      parseRealtimeEventBatch({
        events: [
          {
            sequence: "7",
            id: "event-id",
            type: "inbox.request.created",
            payload: { requestType: "debt" },
            occurredAt: "2026-09-14T00:00:00Z",
          },
        ],
        nextSequence: "7",
        hasMore: false,
      }),
    ).toMatchObject({ nextSequence: "7", hasMore: false });
  });
});
