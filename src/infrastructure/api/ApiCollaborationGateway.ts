import type { ApiClient } from "@/src/application/ports/apiClient";
import type {
    CollaborationGateway,
    SignedUpMemberProfile,
} from "@/src/application/ports/collaborationGateway";
import type { FileGateway } from "@/src/application/ports/fileGateway";

export function createApiCollaborationGateway(
  api: ApiClient,
  files: FileGateway,
): CollaborationGateway {
  return {
    memberDirectory: {
      searchProfiles: async (input) =>
        (await api.memberProfiles.search(input)).data.items.map(
          (profile): SignedUpMemberProfile => ({
            ...profile,
            baseCurrency:
              profile.baseCurrency as SignedUpMemberProfile["baseCurrency"],
          }),
        ),
    },
    memberLinks: {
      createRequest: (input) =>
        api.request("/api/v1/member-links", {
          method: "POST",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
        }),
      hasAcceptedLink: async (targetUserId) =>
        (
          await api.request<{ data: { accepted: boolean } }>(
            `/api/v1/member-links/${targetUserId}`,
          )
        ).data.accepted,
      respondToRequest: (linkRequest, status) =>
        api.request("/api/v1/member-links/respond", {
          method: "POST",
          body: JSON.stringify({ linkRequest, status }),
          headers: { "Content-Type": "application/json" },
        }),
    },
    debtVerifications: {
      create: (input) =>
        api.request("/api/v1/debt-verifications", {
          method: "POST",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
        }),
      respond: (input) =>
        api.request("/api/v1/debt-verifications/respond", {
          method: "POST",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
        }),
      counter: (input) =>
        api.request("/api/v1/debt-verifications/counter", {
          method: "POST",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
        }),
      sendReminder: async (input) =>
        (
          await api.request<{ data: { sent: boolean } }>(
            "/api/v1/debt-verifications/remind",
            {
              method: "POST",
              body: JSON.stringify(input),
              headers: { "Content-Type": "application/json" },
            },
          )
        ).data.sent,
    },
    paymentConfirmations: {
      respond: (input) =>
        api.request("/api/v1/payment-confirmations/respond", {
          method: "POST",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
        }),
      sendReminder: async (input) =>
        (
          await api.request<{ data: { sent: boolean } }>(
            "/api/v1/payment-confirmations/remind",
            {
              method: "POST",
              body: JSON.stringify(input),
              headers: { "Content-Type": "application/json" },
            },
          )
        ).data.sent,
    },
    groups: {
      createInvite: (invite) =>
        api.request("/api/v1/group-invites", {
          method: "POST",
          body: JSON.stringify(invite),
          headers: { "Content-Type": "application/json" },
        }),
      respondToInvite: (invite, status, actorUserId) =>
        api.request(`/api/v1/group-invites/${invite.remoteId ?? invite.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status, actorUserId }),
          headers: { "Content-Type": "application/json" },
        }),
      createMember: (member) =>
        api.request("/api/v1/group-members", {
          method: "POST",
          body: JSON.stringify(member),
          headers: { "Content-Type": "application/json" },
        }),
    },
    attachments: {
      upload: async (attachment) => {
        if (!attachment.localUri) return null;
        const file = await files.readBase64(attachment.localUri);
        return api.request("/api/v1/attachments", {
          method: "POST",
          body: JSON.stringify({ attachment, content: file }),
          headers: { "Content-Type": "application/json" },
        });
      },
    },
    developmentData: {
      resetHostedData: () =>
        api.request("/api/v1/development/reset-data", { method: "POST" }),
    },
    accountDeletion: {
      fetchLatest: async () =>
        (await api.request<{ data: any | null }>("/api/v1/account/deletion"))
          .data,
      request: async (input) =>
        (
          await api.request<{ data: any | null }>("/api/v1/account/deletion", {
            method: "POST",
            body: JSON.stringify(input),
            headers: { "Content-Type": "application/json" },
          })
        ).data,
    },
  };
}
