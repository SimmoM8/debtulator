import type { ApiClient } from "@/src/application/ports/apiClient";
import type { TelemetrySink } from "@/src/application/ports/telemetry";

export function createHttpTelemetrySink(api: ApiClient): TelemetrySink {
  return {
    async write(record) {
      await api.request("/api/v1/telemetry/events", {
        method: "POST",
        body: JSON.stringify(record),
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}
