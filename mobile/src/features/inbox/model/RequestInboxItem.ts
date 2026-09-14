export type RequestInboxScope = "needs_action" | "sent" | "history";

export type RequestInboxDirection = "incoming" | "outgoing";

export type RequestInboxItem = {
  requestId: string;
  type: string;
  action: string | null;
  direction: RequestInboxDirection;
  status: string;
  counterpartyUserId: string;
  counterpartyName: string;
  createdAt: string;
  updatedAt: string;
};
