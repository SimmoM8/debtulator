import type { BackendSyncGateway } from "./BackendSyncGateway";
import type { SyncBootstrapItem, SyncMutation } from "./syncTypes";

/** Only an explicitly reviewed, stale debt UPDATE is eligible for a new attempt. */
export function canReviewDebtConflict(mutation: SyncMutation): boolean {
  const eligible = (
    mutation.status === "conflict" &&
    mutation.lastErrorCode === "VERSION_CONFLICT" &&
    mutation.entityType === "debt" &&
    mutation.operation === "upsert" &&
    mutation.baseVersion !== null &&
    mutation.payloadJson !== null
  );
  if (!eligible || !mutation.payloadJson) return false;

  try {
    const payload = JSON.parse(mutation.payloadJson) as unknown;
    return (
      !!payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      typeof (payload as Record<string, unknown>).amount === "string" &&
      typeof (payload as Record<string, unknown>).currency === "string" &&
      typeof (payload as Record<string, unknown>).title === "string"
    );
  } catch {
    return false;
  }
}

export async function findServerDebt(
  gateway: Pick<BackendSyncGateway, "getBootstrapPage">,
  entityId: string,
): Promise<SyncBootstrapItem | null> {
  let afterId: string | null = null;

  do {
    const page = await gateway.getBootstrapPage("debt", afterId);
    const item = page.items.find((record) => record.entityId === entityId);
    if (item) return item;
    if (!page.hasMore) return null;
    if (!page.nextAfterId || page.nextAfterId === afterId) {
      throw new Error("The server returned an invalid pagination cursor.");
    }
    afterId = page.nextAfterId;
  } while (true);
}

export function describeDebtValues(payload: Record<string, unknown>): string {
  const read = (key: string): string => {
    const value = payload[key];
    return value === undefined || value === null ? "—" : String(value);
  };

  return [
    `Title: ${read("title")}`,
    `Amount: ${read("amount")} ${read("currency")}`,
    `Direction: ${read("direction")}`,
    `Member: ${read("memberId")}`,
    `Due: ${read("dueDate")}`,
  ].join("\n");
}
