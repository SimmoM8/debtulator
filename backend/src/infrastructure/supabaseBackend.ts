import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser } from "../http/requestContext";
import type { Authenticator } from "../auth/authenticator";
import type { MemberDirectoryRepository } from "../memberDirectory/memberDirectoryRepository";

type BackendConfig = {
  url: string;
  anonKey: string;
  developmentResetEnabled: boolean;
};

export function loadBackendConfig(env = process.env): BackendConfig {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  }
  return {
    url,
    anonKey,
    developmentResetEnabled: env.ENABLE_DEVELOPMENT_RESET === "true",
  };
}

export class SupabaseAuthenticator implements Authenticator {
  private readonly client: SupabaseClient;

  constructor(private readonly config: BackendConfig) {
    this.client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async authenticate(authorizationHeader: string | null): Promise<AuthenticatedUser> {
    const token = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length)
      : null;
    if (!token) throw new Error("Bearer authentication is required.");
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) throw new Error("The bearer token is invalid or expired.");
    return {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    };
  }
}

export class SupabaseBackendRepository implements MemberDirectoryRepository {
  constructor(
    private readonly config: BackendConfig,
    private readonly token: string,
  ) {}

  private get client(): SupabaseClient {
    return createClient(this.config.url, this.config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${this.token}` } },
    });
  }

  async search(input: {
    actorUserId: string;
    query: string;
    excludeUserId?: string | null;
    limit: number;
    cursor?: string | null;
  }) {
    const { data, error } = await this.client.rpc("search_member_profiles", {
      search_query: input.query,
      result_limit: input.limit,
    });
    if (error) throw error;
    return {
      items: (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        firstName: row.first_name ?? null,
        lastName: row.last_name ?? null,
        displayName: row.display_name,
        email: row.email ?? null,
        avatarUrl: row.avatar_url ?? null,
        baseCurrency: row.base_currency,
      })),
      nextCursor: null,
    };
  }

  async execute(path: string, body: any, request: Request, user: AuthenticatedUser) {
    const client = this.client;
    if (path === "/api/v1/member-profiles") {
      const url = new URL(request.url);
      return this.search({
        actorUserId: user.id,
        query: url.searchParams.get("query") ?? "",
        excludeUserId: url.searchParams.get("excludeUserId"),
        limit: Number(url.searchParams.get("limit") ?? 20),
        cursor: url.searchParams.get("cursor"),
      });
    }
    if (path === "/api/v1/member-links" && request.method === "POST") {
      const { data, error } = await client.from("link_requests").insert({
        target_user_id: body.targetUserId ?? null,
        target_email: body.targetEmail ?? null,
        target_phone: body.targetPhone ?? null,
        requester_member_local_or_remote_id: body.requesterMemberId,
        requester_label: body.requesterDisplayName,
        message: body.message ?? null,
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }
    if (path === "/api/v1/member-links/respond") {
      return this.rpc("respond_to_member_link_request", {
        p_request_id: body.linkRequest?.remoteId ?? body.linkRequest?.id,
        p_status: body.status,
      });
    }
    if (path.startsWith("/api/v1/member-links/") && path.endsWith("/profile")) {
      const userId = path.split("/")[4];
      return this.rpc("get_accepted_linked_member_profile", { p_other_user_id: userId });
    }
    if (path.startsWith("/api/v1/member-links/") && request.method === "GET") {
      return this.rpc("has_accepted_member_link", { p_other_user_id: path.split("/").pop() });
    }
    if (path === "/api/v1/debt-verifications") {
      const input = body;
      return this.rpc("request_debt_verification", {
        p_debt_id: input.debt?.remoteId ?? input.debt?.id,
        p_responder_user_id: input.responderUserId,
        p_request_type: input.requestType ?? "creation",
        p_change_summary: input.changeSummary ?? null,
      });
    }
    if (path === "/api/v1/debt-verifications/respond") {
      return this.rpc("respond_to_debt_verification", {
        p_verification_id: body.verification?.remoteId ?? body.verification?.id,
        p_status: body.status,
        p_rejection_reason: body.rejectionReason ?? null,
        p_suggested_change: body.suggestedChange ?? null,
      });
    }
    if (path === "/api/v1/debt-verifications/counter") {
      return this.rpc("counter_debt_verification", {
        p_verification_id: body.verification?.remoteId ?? body.verification?.id,
        p_change_summary: body.changeSummary,
        p_reason: body.reason ?? null,
      });
    }
    if (path === "/api/v1/debt-verifications/remind") {
      return this.rpc("send_debt_confirmation_reminder", { p_verification_id: body.verificationRemoteId });
    }
    if (path === "/api/v1/payment-confirmations/respond") {
      return this.rpc("respond_to_payment_confirmation", {
        p_payment_id: body.paymentRemoteId,
        p_status: body.status,
      });
    }
    if (path === "/api/v1/payment-confirmations/remind") {
      return this.rpc("send_payment_confirmation_reminder", { p_payment_id: body.paymentRemoteId });
    }
    if (path === "/api/v1/account/deletion" && request.method === "GET") {
      const { data, error } = await client.from("account_deletion_requests")
        .select("*").eq("subject_user_id", user.id).order("requested_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    }
    if (path === "/api/v1/account/deletion") {
      return this.rpc("request_account_deletion", {
        p_delete_local_data: Boolean(body.deleteLocalData),
        p_keep_local_archive: body.keepLocalArchive !== false,
        p_metadata: body.metadata ?? {},
      });
    }
    if (path === "/api/v1/telemetry/events") {
      const { error } = await client.from("audit_logs").insert({
        actor_user_id: user.id,
        action: body.action ?? "api_event",
        target_type: body.targetId ?? null,
        metadata: body.metadata ?? {},
      });
      if (error) throw error;
      return { recorded: true };
    }
    if (path === "/api/v1/development/reset-data") {
      if (!this.config.developmentResetEnabled) throw new Error("Development reset is disabled.");
      return this.rpc("reset_development_test_data", {});
    }
    if (path === "/api/v1/sync/stage-two") {
      const [linkRequests, sharedDebts, verifications] = await Promise.all([
        client.from("link_requests").select("*").or(`requester_user_id.eq.${user.id},target_user_id.eq.${user.id}`),
        client.from("shared_debt_records").select("*").or(`creator_user_id.eq.${user.id},involved_user_id.eq.${user.id}`),
        client.from("debt_verifications").select("*").or(`requester_user_id.eq.${user.id},responder_user_id.eq.${user.id}`),
      ]);
      for (const result of [linkRequests, sharedDebts, verifications]) if (result.error) throw result.error;
      return { linkRequests: linkRequests.data ?? [], sharedDebts: sharedDebts.data ?? [], verifications: verifications.data ?? [] };
    }
    if (path === "/api/v1/sync") {
      const entries = Array.isArray(body.entries) ? body.entries : [];
      const succeeded: string[] = [];
      const failed: string[] = [];
      const conflicts: string[] = [];
      for (const entry of entries) {
        try {
          const table = syncTableForEntity(entry.entityType);
          if (!table) throw new Error(`Unsupported sync entity: ${entry.entityType}`);
          const payload = { ...(entry.payload ?? {}) };
          if (entry.operation === "archive") payload.archived_at ??= new Date().toISOString();
          const { error } = await client.from(table).upsert(payload);
          if (error) {
            if (error.code === "23505" || error.code === "PGRST116") conflicts.push(entry.id);
            else throw error;
          } else succeeded.push(entry.id);
        } catch {
          failed.push(entry.id);
        }
      }
      const remote = await this.pullAccessibleRecords(client, user.id);
      return { succeeded, failed, conflicts, pulled: remote.groups.length, remote };
    }
    if (path === "/api/v1/group-invites" && request.method === "POST") {
      const { data, error } = await client.from("group_invites").insert({
        group_id: body.groupId,
        inviter_user_id: user.id,
        invited_user_id: body.invitedUserId ?? null,
        invited_email: body.invitedEmail ?? null,
        invited_phone: body.invitedPhone ?? null,
        invited_display_name: body.invitedDisplayName,
        offered_role: body.offeredRole ?? "member",
        message: body.message ?? null,
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }
    if (path.startsWith("/api/v1/group-invites/") && request.method === "PATCH") {
      const id = path.split("/").pop();
      const { data, error } = await client.from("group_invites").update({
        status: body.status,
        responded_at: new Date().toISOString(),
      }).eq("id", id).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }
    if (path === "/api/v1/group-members" && request.method === "POST") {
      const { data, error } = await client.from("group_members").insert({
        group_id: body.groupId,
        type: body.type ?? (body.linkedUserId ? "linked_user" : "unlinked_placeholder"),
        linked_user_id: body.linkedUserId ?? null,
        display_name: body.displayName,
        alias: body.alias ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        created_by_user_id: user.id,
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }
    if (path === "/api/v1/attachments" && request.method === "POST") {
      const content = Buffer.from(String(body.content ?? ""), "base64");
      const attachment = body.attachment ?? {};
      const storagePath = `groups/${attachment.groupId ?? "private"}/${attachment.targetType}/${attachment.targetId}/${attachment.id}-${attachment.fileName}`;
      const upload = await client.storage.from("debtulator-attachments").upload(storagePath, content, {
        contentType: attachment.mimeType ?? "application/octet-stream",
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const { error } = await client.from("attachments").insert({
        id: attachment.id,
        target_type: attachment.targetType,
        target_id: attachment.targetId,
        group_id: attachment.groupId ?? null,
        created_by_user_id: user.id,
        storage_path: storagePath,
        file_name: attachment.fileName,
        file_type: attachment.fileType ?? "file",
        mime_type: attachment.mimeType ?? "application/octet-stream",
        file_size: content.byteLength,
        attachment_kind: attachment.attachmentKind,
        visibility: attachment.visibility ?? "private",
        sync_status: "synced",
      });
      if (error) throw error;
      const signed = await client.storage.from("debtulator-attachments").createSignedUrl(storagePath, 600);
      if (signed.error) throw signed.error;
      return { storagePath, remoteUrl: signed.data.signedUrl };
    }
    throw new Error(`No backend operation is registered for ${request.method} ${path}.`);
  }

  private async rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw error;
    return data;
  }

  private async pullAccessibleRecords(client: SupabaseClient, userId: string) {
    const membership = await client.from("group_participants").select("group_id").eq("user_id", userId);
    if (membership.error) throw membership.error;
    const groupIds = (membership.data ?? []).map((row: { group_id: string }) => row.group_id);
    const query = (table: string) => groupIds.length
      ? client.from(table).select("*").in("group_id", groupIds)
      : Promise.resolve({ data: [], error: null });
    const [groups, participants, invites, members, expenses, splits, payers, debts, payments, settlements, comments, attachments, activity] = await Promise.all([
      query("groups"), query("group_participants"), query("group_invites"), query("group_members"),
      query("group_expenses"), query("group_expense_splits"), query("expense_payers"), query("group_debts"), query("payments"), query("settlements"),
      query("comments"), query("attachments"), query("group_activity_logs"),
    ]);
    for (const result of [groups, participants, invites, members, expenses, splits, payers, debts, payments, settlements, comments, attachments, activity]) {
      if (result.error) throw result.error;
    }
    return {
      groups: groups.data ?? [], participants: participants.data ?? [], invites: invites.data ?? [],
      members: members.data ?? [], expenses: expenses.data ?? [], splits: splits.data ?? [], payers: payers.data ?? [], debts: debts.data ?? [],
      payments: payments.data ?? [], settlements: settlements.data ?? [], comments: comments.data ?? [],
      attachments: attachments.data ?? [], activity: activity.data ?? [],
    };
  }
}

function syncTableForEntity(entityType: string): string | null {
  const tables: Record<string, string> = {
    group: "groups",
    group_participant: "group_participants",
    group_invite: "group_invites",
    group_member: "group_members",
    group_member_claim: "group_member_claims",
    debt: "shared_debt_records",
    shared_expense: "group_expenses",
    group_debt: "group_debts",
    group_verification_response: "group_verification_responses",
    payment: "payments",
    settlement: "settlements",
    settlement_line: "settlement_lines",
    attachment: "attachments",
    comment: "comments",
    group_activity_log: "group_activity_logs",
    group_duplicate_warning: "group_duplicate_warnings",
  };
  return tables[entityType] ?? null;
}