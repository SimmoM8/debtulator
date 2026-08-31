import type { SupabaseClient } from "@supabase/supabase-js";

import type { RemoteSyncChange, SyncMutation } from "@/src/data/sync/syncTypes";

const PAGE_SIZE = 250;

export class SupabaseSyncGateway {
  constructor(private readonly client: SupabaseClient) {}

  async pushMutation(mutation: SyncMutation): Promise<void> {
    if (mutation.operation === "delete") {
      await this.deleteMutation(mutation);
      return;
    }

    await this.upsertMutation(mutation);
  }

  async getChangesAfter(
    ownerUserId: string,
    sequence: number,
  ): Promise<RemoteSyncChange[]> {
    const { data, error } = await this.client
      .from("sync_changes")
      .select(
        `
          sequence,
          owner_user_id,
          entity_type,
          entity_id,
          operation,
          payload,
          changed_at
        `,
      )
      .eq("owner_user_id", ownerUserId)
      .gt("sequence", sequence)
      .order("sequence", {
        ascending: true,
      })
      .limit(PAGE_SIZE);

    if (error) {
      throw error;
    }

    return (data ?? []) as RemoteSyncChange[];
  }

  private async upsertMutation(mutation: SyncMutation): Promise<void> {
    if (!mutation.payloadJson) {
      throw new Error(`Missing payload for ${mutation.entityType} upsert.`);
    }

    const payload = JSON.parse(mutation.payloadJson);

    const table = mutation.entityType === "member" ? "members" : "debts";

    const { error } = await this.client.from(table).upsert(payload, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }
  }

  private async deleteMutation(mutation: SyncMutation): Promise<void> {
    const table = mutation.entityType === "member" ? "members" : "debts";

    const { error } = await this.client
      .from(table)
      .delete()
      .eq("id", mutation.entityId)
      .eq("owner_user_id", mutation.ownerUserId);

    if (error) {
      throw error;
    }
  }
}
