# Privacy Model

Debtulator is private by default.

Private records do not become shared because the user signs in, links a member, joins an group, or enables backup. Shared visibility must be explicit. Restored records default to local/private unless the user deliberately re-shares them.

Notification bodies avoid sensitive financial details unless the user enables detailed notifications. Full exports and backups have separate controls for private notes/comments and attachments.

Account deletion now records an auditable request and fulfillment status (`pending`, `completed`, or `failed`). Fulfillment anonymizes profile-linked records and shared attachments, disables push/email notification eligibility, and preserves shared financial history for other participants. Requests fail fast when unresolved owned sync conflicts could risk inconsistent deletion.
