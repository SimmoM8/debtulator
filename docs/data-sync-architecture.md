# Data Sync Architecture

Debtulator remains local-first. SQLite is always available. Supabase is optional and only used when configured and the user is authenticated.

Private records do not sync automatically. Shared records sync through durable `sync_queue` operations and the mapper layer in `src/services/sync/mappers.ts`.

| Record | Local table | Remote table | Source of truth | Private | Shared | Ownership / visibility | Sync behavior | Conflict / delete behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UserProfile | `user_profiles` | `profiles` | remote-owned cached locally | no | account | `id` is auth user | profile upsert/pull | remote wins except local profile edit |
| Member | `members` | none for private contacts | local-only, link metadata syncable | yes | via link | `linked_user_id`, `link_status` | private local; link state may sync through requests | archive locally |
| LinkRequest | `link_requests` | `link_requests` | local-first syncable | no | yes | requester/target fields | Stage 2 pull/push path | status updates preserve history |
| Debt | `debts` | `shared_debt_records` | local-first syncable when shared | yes | involved user | `visibility`, creator/involved remote fields | private stays local; shared debt sync remains Stage 2 | financial divergence creates conflict when queued |
| Group | `groups` | `groups` | shared collaborative | yes | yes | `owner_user_id`, `visibility`, participants | shared groups queue/pull | archive/lock conflicts are recorded |
| GroupParticipant | `group_participants` | `group_participants` | remote-owned cached locally | no | yes | `user_id`, `role`, `status` | pulled/pushed with group create/invites | owner/admin role enforced by RLS |
| GroupInvite | `group_invites` | `group_invites` | shared collaborative | no | yes | inviter/invited fields | queued create/update, pulled by inviter/invitee | status history retained |
| GroupMember | `shared_group_members` | `group_members` | shared collaborative | no | yes | `linked_user_id`, `created_by_user_id`, status | local IDs map through `remote_id` | merge/archive conflicts recorded |
| GroupMemberClaim | `group_member_claims` | `group_member_claims` | shared collaborative | no | yes | claimant and group role | queued create/update, pulled | claim answer preserves audit trail |
| GroupDuplicateWarning | `group_duplicate_warnings` | `group_duplicate_warnings` | shared collaborative | no | yes | group role | pulled; local generation still exists | ignored/resolved status syncable |
| SharedExpense | `shared_expenses` | `group_expenses` | shared collaborative | no | yes | creator, group participants | queued create/update/archive plus splits/payers | financial conflicts are never auto-resolved |
| ExpenseSplit | `shared_expenses.participant_ids_json`, `split_allocations_json` | `group_expense_splits` | derived/persisted split inputs | no | yes | group member | pushed/pulled with expense | regenerated locally; mapping errors stop sync |
| ExpensePayer | `expense_payers` | `expense_payers` | shared collaborative | no | yes | group member | pushed/pulled with expense | financial conflicts follow parent expense |
| GroupDebt | `group_debts` | `group_debts` | shared collaborative | no | yes | creator, debtor, creditor | queued create/update/archive, pulled | financial conflicts recorded |
| GroupVerificationResponse | `group_verification_responses` | `group_verification_responses` | shared collaborative | no | yes | linked group member/user | queued upsert, pulled | verification changes can conflict with pending edits |
| Payment | `payments` | `payments` | local-first syncable when shared | yes | yes | creator, payer/payee, group | group payments queued/pulled | payment conflicts recorded |
| Settlement | `settlements` | `settlements` | persisted accepted settlement | yes | yes | creator, group/member | group settlements queued/pulled | settlement conflicts recorded |
| SettlementLine | `settlement_lines` | `settlement_lines` | persisted explanation of payment application | yes | yes | parent settlement | pushed after settlement create, pulled | follows parent settlement/payment |
| OverpaymentCredit | `overpayment_credits` | `overpayment_credits` | derived/persisted credit record | yes | yes | payer/payee/group | local derivation exists; remote table available | no silent overwrite |
| Comment | `comments` | `comments` | local-first syncable when shared | yes | yes | author, visibility, group | private local; shared queued/pulled | deleted via `deleted_at` |
| Attachment | `attachments` | `attachments` + storage | metadata syncable | yes | yes | creator, visibility, group | metadata queued/pulled; files use existing upload path | archive via `archived_at` |
| ActivityLog | `activity_log`, `group_activity_logs` | `activity_logs`, `group_activity_logs` | append-only | local | shared group | actor/group | local logs and remote group activity pulled | append-only |
| AuditLog | `audit_logs` | `audit_logs` | append-only | account | group/account | actor/group | local append, backend append available | append-only |
| SyncQueueEntry | `sync_queue` | none | local sync control | local | local | entity/operation | executor processes pending/failed | transient retry, permission/mapping stop |
| SyncConflict | `sync_conflicts` | `sync_conflicts` | local-first conflict review | local | account | owner/user | created by executor; UI reads existing table | manual resolution required |

## Derived Truth

Generated obligations are derived from shared expenses, splits, and payers. Settlement suggestions are derived from ledger entries. Accepted payments, settlements, and settlement lines are persisted because they represent historical financial decisions.

