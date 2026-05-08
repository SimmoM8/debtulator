# Data Sync Architecture

Debtulator remains local-first. SQLite is always available. Supabase is optional and only used when configured and the user is authenticated.

Private records do not sync automatically. Shared records sync through durable `sync_queue` operations and the mapper layer in `src/services/sync/mappers.ts`.

| Record | Local table | Remote table | Source of truth | Private | Shared | Ownership / visibility | Sync behavior | Conflict / delete behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UserProfile | `user_profiles` | `profiles` | remote-owned cached locally | no | account | `id` is auth user | profile upsert/pull | remote wins except local profile edit |
| Member | `members` | none for private contacts | local-only, link metadata syncable | yes | via link | `linked_user_id`, `link_status` | private local; link state may sync through requests | archive locally |
| LinkRequest | `link_requests` | `link_requests` | local-first syncable | no | yes | requester/target fields | Stage 2 pull/push path | status updates preserve history |
| Debt | `debts` | `shared_debt_records` | local-first syncable when shared | yes | involved user | `visibility`, creator/involved remote fields | private stays local; shared debt sync remains Stage 2 | financial divergence creates conflict when queued |
| Event | `events` | `events` | shared collaborative | yes | yes | `owner_user_id`, `visibility`, participants | shared events queue/pull | archive/lock conflicts are recorded |
| EventParticipant | `event_participants` | `event_participants` | remote-owned cached locally | no | yes | `user_id`, `role`, `status` | pulled/pushed with event create/invites | owner/admin role enforced by RLS |
| EventInvite | `event_invites` | `event_invites` | shared collaborative | no | yes | inviter/invited fields | queued create/update, pulled by inviter/invitee | status history retained |
| EventMember | `shared_event_members` | `event_members` | shared collaborative | no | yes | `linked_user_id`, `created_by_user_id`, status | local IDs map through `remote_id` | merge/archive conflicts recorded |
| EventMemberClaim | `event_member_claims` | `event_member_claims` | shared collaborative | no | yes | claimant and event role | queued create/update, pulled | claim answer preserves audit trail |
| EventDuplicateWarning | `event_duplicate_warnings` | `event_duplicate_warnings` | shared collaborative | no | yes | event role | pulled; local generation still exists | ignored/resolved status syncable |
| SharedExpense | `shared_expenses` | `event_expenses` | shared collaborative | no | yes | creator, event participants | queued create/update/archive plus splits/payers | financial conflicts are never auto-resolved |
| ExpenseSplit | `shared_expenses.participant_ids_json`, `split_allocations_json` | `event_expense_splits` | derived/persisted split inputs | no | yes | event member | pushed/pulled with expense | regenerated locally; mapping errors stop sync |
| ExpensePayer | `expense_payers` | `expense_payers` | shared collaborative | no | yes | event member | pushed/pulled with expense | financial conflicts follow parent expense |
| EventDebt | `event_debts` | `event_debts` | shared collaborative | no | yes | creator, debtor, creditor | queued create/update/archive, pulled | financial conflicts recorded |
| EventVerificationResponse | `event_verification_responses` | `event_verification_responses` | shared collaborative | no | yes | linked event member/user | queued upsert, pulled | verification changes can conflict with pending edits |
| Payment | `payments` | `payments` | local-first syncable when shared | yes | yes | creator, payer/payee, event | event payments queued/pulled | payment conflicts recorded |
| Settlement | `settlements` | `settlements` | persisted accepted settlement | yes | yes | creator, event/member | event settlements queued/pulled | settlement conflicts recorded |
| SettlementLine | `settlement_lines` | `settlement_lines` | persisted explanation of payment application | yes | yes | parent settlement | pushed after settlement create, pulled | follows parent settlement/payment |
| OverpaymentCredit | `overpayment_credits` | `overpayment_credits` | derived/persisted credit record | yes | yes | payer/payee/event | local derivation exists; remote table available | no silent overwrite |
| Comment | `comments` | `comments` | local-first syncable when shared | yes | yes | author, visibility, event | private local; shared queued/pulled | deleted via `deleted_at` |
| Attachment | `attachments` | `attachments` + storage | metadata syncable | yes | yes | creator, visibility, event | metadata queued/pulled; files use existing upload path | archive via `archived_at` |
| ActivityLog | `activity_log`, `event_activity_logs` | `activity_logs`, `event_activity_logs` | append-only | local | shared event | actor/event | local logs and remote event activity pulled | append-only |
| AuditLog | `audit_logs` | `audit_logs` | append-only | account | event/account | actor/event | local append, backend append available | append-only |
| SyncQueueEntry | `sync_queue` | none | local sync control | local | local | entity/operation | executor processes pending/failed | transient retry, permission/mapping stop |
| SyncConflict | `sync_conflicts` | `sync_conflicts` | local-first conflict review | local | account | owner/user | created by executor; UI reads existing table | manual resolution required |

## Derived Truth

Generated obligations are derived from shared expenses, splits, and payers. Settlement suggestions are derived from ledger entries. Accepted payments, settlements, and settlement lines are persisted because they represent historical financial decisions.

