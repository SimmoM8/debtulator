export type Member = {
  id: string;
  ownerUserId: string;
  displayName: string;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number | null;
};
