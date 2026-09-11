export type MemberSqlRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  linked_user_id: string | null;
  created_at: string;
  updated_at: string;
  version: number | null;
};
