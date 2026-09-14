import { describe, expect, it } from "@jest/globals";
import { createRealtimeUrl } from "@/src/data/realtime/realtimeUrl";

describe("createRealtimeUrl", () => {
  it("converts HTTPS backend URLs to secure WebSocket URLs", () => {
    expect(
      createRealtimeUrl("https://api.debtulator.example", "ticket-id"),
    ).toBe(
      "wss://api.debtulator.example/api/v1/realtime?ticket=ticket-id",
    );
  });

  it("preserves a backend base path", () => {
    expect(
      createRealtimeUrl("http://localhost:8787/backend/", "ticket-id"),
    ).toBe(
      "ws://localhost:8787/backend/api/v1/realtime?ticket=ticket-id",
    );
  });
});
