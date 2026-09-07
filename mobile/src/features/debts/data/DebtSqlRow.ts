export type DebtSqlRow = {
  id: string;
  owner_user_id: string;
  member_id: string;
  direction: string;
  amount: number;
  currency: string;
  title: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
