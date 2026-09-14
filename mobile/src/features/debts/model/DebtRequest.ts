export type DebtRequestDirection = "incoming" | "outgoing";
export type DebtRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "superseded";

export type DebtRequestPayload = {
  memberId: string;
  direction: "you_owe" | "they_owe";
  amount: string;
  currency: string;
  title: string;
  dueDate: string | null;
};

export type DebtRequest = {
  id: string;
  direction: DebtRequestDirection;
  userId: string;
  entityId: string;
  entityVersion: number;
  action: "create";
  payload: DebtRequestPayload;
  status: DebtRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
};
