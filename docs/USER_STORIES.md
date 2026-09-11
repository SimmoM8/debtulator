# Debtulator — User Stories

> **Document status:** Product requirements baseline  
> **Purpose:** Define user-facing behaviour and product scope for Debtulator in a way that can guide product design, architecture, implementation, testing, and release planning.  
> **Last updated:** 2026-09-11  
> **Implementation baseline:** Backend authentication work has partially implemented 7 stories; no story is yet fully implemented.

---

## 1. Product Vision

Debtulator is a personal and collaborative debt-management application for tracking money owed between people.

The product should make it easy to:

- record and manage debts;
- manage people as linked or unlinked members;
- record repayments without requiring real money to move through the app;
- split bills, expenses, and other shared costs;
- collaborate with real Debtulator users;
- organise shared debts through groups and events;
- send and receive debt-related requests and reminders;
- understand debt history through reports and exports;
- work reliably across devices with secure account-backed synchronisation; and
- later support regulated real-money settlement through compliant payment providers.

Debtulator should remain useful even when the other person involved in a debt does not have a Debtulator account.

---

## 2. Product Principles

### 2.1 Local usefulness first

A user must be able to record a debt with an **unlinked member** without requiring that person to create an account.

### 2.2 Collaboration when available

When another person is a Debtulator user, the member can be **linked** to that real account so both parties can participate in shared debt workflows.

### 2.3 Financial records are not necessarily payments

A recorded repayment is a ledger event stating that money changed hands outside Debtulator.

Unless explicitly stated otherwise, Debtulator does **not** process, hold, transmit, or custody funds.

### 2.4 User control

Changes that affect another linked user should use transparent request, approval, notification, or audit mechanisms where appropriate.

### 2.5 Privacy and security by default

Debt information, personal information, relationships, groups, attachments, and financial history are private data and must be protected accordingly.

### 2.6 Clear financial history

Changes to balances should be explainable through debt history, payment records, edits, requests, and audit information.

### 2.7 Progressive complexity

The core product should remain simple for users who only need basic debt tracking while advanced collaboration, groups, analytics, attachments, and payments can build on top of that foundation.

---

# 3. Priority Model

| Priority | Meaning |
|---|---|
| **P0 — Core** | Required for a credible first production release. |
| **P1 — Collaboration & Growth** | Important capabilities that expand Debtulator beyond personal debt tracking. |
| **P2 — Advanced** | Valuable later-stage product capabilities. |
| **Future — Regulated** | Features requiring substantial legal, financial, compliance, or operational work. |

Priority indicates recommended product sequencing, not technical difficulty.

---

# 4. Actors

Every user story in this document is assigned to **exactly one primary actor** from the seven actors below.

The `Actor` field identifies who primarily receives the value or protection described by the story. Other actors may participate in the same workflow, but they do not become additional primary actors unless a separate story is required.

## 4.1 Visitor

A person who has opened Debtulator but is not currently authenticated.

This includes first-time users, returning signed-out users, and users recovering access to an existing account.

## 4.2 Authenticated User

A person with a valid Debtulator account and authenticated session acting in their own personal Debtulator workspace.

This is the primary actor for personal members, debts, repayments, account settings, reports, exports, and other account-level functionality.

## 4.3 Unlinked Member

A person represented inside another user's Debtulator records who is **not** currently associated with a confirmed Debtulator account relationship.

An Unlinked Member may not have a Debtulator account and may not know that another person has represented them in a private ledger. This is therefore primarily a **domain and privacy stakeholder actor**, rather than necessarily an interactive app user.

Stories assigned to this actor define protections around how Debtulator represents, stores, exposes, and later links that person.

## 4.4 Linked Member

A Debtulator user viewed in the context of an established linked-member relationship with another Debtulator user.

This actor is used when the requirement specifically concerns the rights, protections, shared records, reminders, auditability, or collaboration of a person who is already linked.

## 4.5 Group or Event Participant

A Debtulator user participating in a shared group or event without exercising management authority for the action being described.

This actor is used for viewing group information, participating in group debts or splits, leaving groups, and other participant-level actions.

## 4.6 Group or Event Manager

A participant who has explicit permission to manage relevant group or event settings, membership, lifecycle, or permissions.

This actor is used only when the story requires elevated group-level authority.

## 4.7 Administrator

An authorised Debtulator administrative, support, security, moderation, product-operations, or service-operations role acting within explicitly granted permissions.

Administrator access is governed by least privilege and does **not** imply unrestricted access to private user data.

Administrative stories must distinguish legitimate operational requirements from private user functionality.

## 4.8 Actor Classification Rules

| Actor | Primary story ownership |
|---|---|
| **Visitor** | Registration, sign-in, password recovery, and other pre-authentication workflows. |
| **Authenticated User** | Personal account, members, debts, payment records, reports, settings, exports, sync, and ordinary app use. |
| **Unlinked Member** | Privacy, representation, and transition rules affecting a person represented without a confirmed account link. |
| **Linked Member** | Rights and protections specific to an established linked relationship and shared collaborative records. |
| **Group or Event Participant** | Participant-level group/event viewing, debts, splits, attachments, analytics, and leaving. |
| **Group or Event Manager** | Group/event editing, invitations, membership administration, permissions, and archival. |
| **Administrator** | Lawful service administration, moderation, security, operational analytics, reliability, and audited support actions. |

### Classification rule

A feature area does not determine the actor by itself.

For example:

- creating a personal split expense belongs to the **Authenticated User**;
- creating a split inside a group belongs to the **Group or Event Participant**;
- changing group membership belongs to the **Group or Event Manager**;
- protection from abusive reminders within a linked relationship belongs to the **Linked Member**.

This distinction should be preserved when new stories are added.

## 4.9 User Story Metadata Standard

Every user story uses the following metadata:

```md
**Actor:** <one of the seven defined actors>
**Priority:** <P0 | P1 | P2 | Future — Regulated>
**Implementation status:** <optional implementation marker>
```

Implementation status markers are:

- `[FI]` — **Fully implemented**: the complete story and its relevant acceptance criteria are implemented and usable.
- `[PI]` — **Partly implemented**: meaningful parts of the story exist, but the complete required behaviour is not yet implemented.
- no marker — **Not implemented**.

A story must not be marked `[FI]` merely because a screen, route, database table, or partial happy path exists. The complete user-facing behaviour and relevant acceptance criteria must be satisfied.

Implementation status is evaluated per complete user story, not per individual technical component. A story with only some acceptance criteria satisfied should be `[PI]`, not `[FI]`.

**Current baseline:** 7 stories are marked `[PI]` for meaningful backend authentication/account-security implementation. No story is marked `[FI]`; full user-facing completion still requires the corresponding mobile UI, secure client session handling, and production Supabase/email configuration.


## 4.10 Current Actor Coverage

Every current user story has been classified under one of the seven defined actors.

| Actor | Current stories |
|---|---:|
| **Visitor** | 6 |
| **Authenticated User** | 100 |
| **Unlinked Member** | 1 |
| **Linked Member** | 4 |
| **Group or Event Participant** | 8 |
| **Group or Event Manager** | 7 |
| **Administrator** | 10 |
| **Total** | 136 |

The distribution is intentionally uneven. Most functionality is owned by the **Authenticated User**, while Unlinked Member and Linked Member stories primarily exist where the relationship itself creates distinct privacy, consent, or collaboration requirements.

---

# 5. Authentication and Onboarding

## AUTH-001 — Create an account

**Actor:** Visitor  
**Priority:** P0  
**Implementation status:** [PI]

**As a** **Visitor**,
**I want** to create a Debtulator account,  
**so that** my debts and members can be securely saved and synchronised.

### Acceptance criteria

- The user can register using supported first-party account credentials.
- Required information is clearly identified.
- Invalid or already-used credentials produce understandable errors.
- The user is informed of applicable terms and privacy information before account creation.
- Successful registration results in a valid authenticated account or a clearly explained verification step.

---

## AUTH-002 — Sign in

**Actor:** Visitor  
**Priority:** P0  
**Implementation status:** [PI]

**As a** **Visitor**,
**I want** to securely sign in,  
**so that** I can access my Debtulator data.

### Acceptance criteria

- Valid credentials authenticate the user.
- Invalid credentials do not reveal unnecessary account information.
- Authentication state persists appropriately across app restarts.
- Expired or revoked sessions are handled safely.

---

## AUTH-003 — Sign in with Apple

**Actor:** Visitor  
**Priority:** P1  
**Implementation status:**

**As a** **Visitor**,
**I want** to authenticate with Apple,  
**so that** I can use a familiar and secure authentication method.

---

## AUTH-004 — Sign in with Google

**Actor:** Visitor  
**Priority:** P1  
**Implementation status:**

**As a** **Visitor**,
**I want** to authenticate with Google,  
**so that** I can create or access my account without managing another password.

---

## AUTH-005 — Sign in with Facebook

**Actor:** Visitor  
**Priority:** P1  
**Implementation status:**

**As a** **Visitor**,
**I want** to authenticate with Facebook where supported,  
**so that** I can use an existing identity provider.

---

## AUTH-006 — Recover a forgotten password

**Actor:** Visitor  
**Priority:** P0  
**Implementation status:** [PI]

**As a** **Visitor**,
**I want** a secure password-recovery process,  
**so that** I can regain access to my account.

### Acceptance criteria

- Recovery does not expose whether unrelated accounts exist.
- Recovery tokens or links expire.
- A successful password reset invalidates sessions when appropriate.
- The user receives clear confirmation when the reset succeeds.

---

## AUTH-007 — Sign out

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:** [PI]

**As an** **Authenticated User**,
**I want** to sign out,  
**so that** another person using my device cannot access my account.

---

## AUTH-008 — Onboarding

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** a short introduction to Debtulator's core concepts,  
**so that** I understand debts, members, linking, and payment records.

### Acceptance criteria

The onboarding should clearly distinguish:

- linked and unlinked members;
- debts and repayments;
- recorded payments and actual money transfers; and
- personal records and collaborative records.

The onboarding must be skippable.

---

# 6. Account, Profile, Privacy, and Security

## ACCOUNT-001 — View my profile

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:** [PI]

**As an** **Authenticated User**,
**I want** to view my account information,  
**so that** I can understand what information Debtulator stores about my account.

---

## ACCOUNT-002 — Edit my profile

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to update editable profile information,  
**so that** my account remains accurate.

---

## ACCOUNT-003 — Manage authentication methods

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view and manage supported authentication methods linked to my account,  
**so that** I can maintain secure access.

---

## ACCOUNT-004 — Change password

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:** [PI]

**As an** **Authenticated User**,
**I want** to change my password,  
**so that** I can protect my account.

---

## ACCOUNT-005 — Delete my account

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to request deletion of my account and applicable personal data,  
**so that** I retain control over my information.

### Acceptance criteria

- The consequences of deletion are clearly explained.
- Required retention obligations are distinguished from deletable data.
- Shared records are handled without corrupting another user's legitimate financial history.
- Destructive actions require appropriate confirmation.

---

## ACCOUNT-006 — Export my personal data

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to export applicable personal data associated with my account,  
**so that** I can retain or transfer my information.

---

## ACCOUNT-007 — Manage privacy preferences

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to manage relevant privacy and discoverability settings,  
**so that** I control how other users can find and interact with me.

Possible controls may include:

- discoverability by username;
- discoverability by email or phone where legally and technically appropriate;
- QR-code linking;
- incoming member-link requests; and
- analytics or optional data-processing preferences.

---

## ACCOUNT-008 — Review active sessions

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to review and revoke active sessions or devices,  
**so that** I can protect my account if a device is lost or compromised.

---

# 7. App Home and Overview

## OVERVIEW-001 — View financial summary

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see an overview of what I owe and what others owe me,  
**so that** I can quickly understand my current position.

### Acceptance criteria

The overview should be capable of showing:

- total amount I owe;
- total amount owed to me;
- net position;
- useful recent activity; and
- meaningful due or overdue information.

Amounts in different currencies must not be misleadingly combined unless a clear conversion method is available.

---

## OVERVIEW-002 — View recent activity

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see recent debt-related activity,  
**so that** I can understand what has changed.

Activity may include:

- new debts;
- debt edits;
- repayments;
- linked-member activity;
- requests;
- reminders;
- group changes; and
- completed settlements.

---

## OVERVIEW-003 — Navigate to common actions

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** quick access to common actions,  
**so that** recording a debt or member does not require unnecessary navigation.

---

# 8. Members

## MEMBER-001 — View members

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view my saved members,  
**so that** I can access the people associated with my debts.

### Acceptance criteria

- Linked and unlinked members can both be displayed.
- Their linked status is understandable.
- Members can be searched and filtered.

---

## MEMBER-002 — Add an unlinked member

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to create a member without requiring them to have a Debtulator account,  
**so that** I can immediately start recording debts with them.

---

## MEMBER-003 — View member details

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view a member's details and financial relationship with me,  
**so that** I can understand our debts and repayment history.

The view may include:

- member information;
- linked status;
- total balance;
- debts;
- payment records;
- shared groups or events;
- recent activity; and
- relevant actions.

---

## MEMBER-004 — Edit an unlinked member

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to edit an unlinked member's details,  
**so that** I can correct or update my records.

---

## MEMBER-005 — Remove an unlinked member

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to remove an unneeded member when doing so is safe,  
**so that** my member list stays organised.

### Acceptance criteria

- Removing a member must not silently destroy required debt history.
- If the member still has relevant records, the app should explain the consequence and offer an appropriate safe action.

---

## MEMBER-006 — Search and filter members

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to search, sort, and filter my members,  
**so that** I can quickly find the person I need.

Common filters should include:

- all;
- linked; and
- unlinked.

---

## MEMBER-007 — Protect unlinked-member representation

**Actor:** Unlinked Member  
**Priority:** P0  
**Implementation status:**

**As an** **Unlinked Member**,
**I want** records about me to remain a private representation within the creating user's ledger unless an explicit linking or invitation workflow occurs,  
**so that** being recorded in Debtulator does not falsely imply that I have an account, accepted a debt, or consented to share my information.

### Acceptance criteria

- Creating an unlinked member does not create a Debtulator account for that person.
- An unlinked member is not presented to other users as a verified Debtulator user.
- Private notes or metadata added by the creating user are not automatically exposed to the represented person or other users.
- Creating an unlinked member does not by itself send messages, invitations, or notifications to the represented person.
- If the member is later linked to a real Debtulator user, historical records are shared only according to an explicit product rule and must not become visible silently.
- The system must avoid collecting unnecessary personal information about an unlinked person.

---

# 9. Linked Members and User Discovery

## LINK-001 — Link an existing member to a Debtulator user

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to link an existing unlinked member to a real Debtulator user,  
**so that** our shared records can become collaborative.

### Acceptance criteria

- The target user must be clearly identifiable.
- Linking must not occur silently without appropriate confirmation.
- Existing records must not be duplicated merely because the member becomes linked.
- Any records becoming visible to another user must follow explicit product rules.

---

## LINK-002 — Search for Debtulator users

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to search for other users using allowed identifiers,  
**so that** I can add or link them as members.

Search and discoverability must respect privacy settings and anti-enumeration protections.

---

## LINK-003 — Add a linked member directly

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to find a Debtulator user and add them directly as a linked member,  
**so that** I do not need to create an unlinked member first and link them later.

---

## LINK-004 — Link using a QR code

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to scan another user's Debtulator QR code,  
**so that** I can quickly identify and link the correct person.

### Acceptance criteria

- QR data must not expose unnecessary sensitive information.
- Expiry or revocation should be supported where appropriate.
- Scanning a code must not by itself authorise unintended account changes.

---

## LINK-005 — Share my linking QR code

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to display or share a secure linking QR code,  
**so that** another person can find the correct Debtulator account.

---

## LINK-006 — Accept or reject a member-link request

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to accept or reject a request to link with another user,  
**so that** I control who becomes connected to me.

---

## LINK-007 — Unlink a member

**Actor:** Linked Member  
**Priority:** P1  
**Implementation status:**

**As a** **Linked Member**,
**I want** to unlink another user when appropriate,  
**so that** future collaboration can stop without destroying valid historical records.

---

## LINK-008 — Block a user

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to block another user,  
**so that** they cannot continue unwanted requests or interactions with me.

---

# 10. Debts

## DEBT-001 — View all debts

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view my debts,  
**so that** I can understand what I owe and what others owe me.

---

## DEBT-002 — Filter, sort, and search debts

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to search, sort, and filter debts,  
**so that** I can find relevant records quickly.

Possible filters include:

- all debts;
- I owe;
- owed to me;
- due soon;
- overdue;
- settled;
- unsettled;
- member;
- group or event; and
- currency.

---

## DEBT-003 — Create a debt

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to create a debt with a member,  
**so that** I can record money owed between us.

### Acceptance criteria

A debt should support, where applicable:

- debtor and creditor direction;
- member;
- amount;
- currency;
- title or description;
- optional due date;
- creation timestamp; and
- appropriate provenance or creator information.

Amounts must use safe monetary handling and must not rely on imprecise floating-point assumptions.

---

## DEBT-004 — View debt details

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view the complete details of a debt,  
**so that** I can understand its current status and history.

---

## DEBT-005 — Edit a debt

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to edit a debt,  
**so that** mistakes or legitimate changes can be corrected.

### Acceptance criteria

- Significant changes should be represented clearly in history where appropriate.
- Collaborative debt changes may require the other participant's approval depending on the change.
- Editing must not silently rewrite financial history in a misleading way.

---

## DEBT-006 — Delete, cancel, or archive a debt safely

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** an appropriate way to remove or cancel incorrect debts,  
**so that** mistakes do not remain active indefinitely.

Financially meaningful records should favour cancellation, archival, or audit-preserving actions over irreversible history destruction.

---

## DEBT-007 — Mark a debt as settled through recorded activity

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** a debt to become settled when its outstanding balance reaches zero,  
**so that** completed obligations are clearly distinguished from active ones.

---

## DEBT-008 — View debt history

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see the history of a debt,  
**so that** I can understand how its current balance was reached.

History may include:

- creation;
- edits;
- recorded repayments;
- cancellations;
- requests;
- reminders; and
- settlement.

---

## DEBT-009 — Add notes

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to add notes to a debt,  
**so that** I can retain useful context.

---

## DEBT-010 — Support recurring debts

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to optionally create recurring debt records,  
**so that** repeated obligations do not need to be entered manually each time.

---

# 11. Recorded Payments and Repayments

## PAYMENT-RECORD-001 — Record a repayment against a debt

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to record that some or all of a debt was paid outside Debtulator,  
**so that** the remaining balance is accurate.

### Acceptance criteria

- A recorded payment includes an amount and date.
- It can optionally include a note or external reference.
- The debt balance updates consistently.
- A repayment cannot unintentionally create an impossible balance state.
- The UI clearly states that Debtulator did not necessarily process the payment.

---

## PAYMENT-RECORD-002 — Record a general payment with a member

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to record a payment involving a member without manually applying it to each debt,  
**so that** I can reconcile our balance efficiently.

The product should define clearly how a general payment is allocated across outstanding debts.

---

## PAYMENT-RECORD-003 — Edit or correct a payment record

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to correct an incorrectly recorded payment,  
**so that** my financial history remains accurate.

Corrections should remain auditable where appropriate.

---

## PAYMENT-RECORD-004 — View payment history

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see recorded repayments and adjustments,  
**so that** I understand how balances changed.

---

## PAYMENT-RECORD-005 — Record a full settlement

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to record that the remaining amount has been paid,  
**so that** the debt can be closed efficiently.

---

# 12. Split Bills and Shared Expenses

## SPLIT-001 — Create a split expense

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to record an expense or payment that should be split between people,  
**so that** Debtulator can calculate who owes whom.

The feature must not assume the item is literally a bill. It may represent any real-world cost or payment being shared.

---

## SPLIT-002 — Split equally

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to divide an amount equally between participants,  
**so that** common shared expenses are quick to record.

---

## SPLIT-003 — Split by custom amounts

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to assign custom amounts to participants,  
**so that** unequal contributions can be represented accurately.

---

## SPLIT-004 — Split by percentage or shares

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to divide a shared cost by percentage or shares,  
**so that** more complex arrangements can be represented.

---

## SPLIT-005 — Record who paid

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to specify who actually paid the real-world amount,  
**so that** the resulting debts are calculated correctly.

---

## SPLIT-006 — Preview resulting debts

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to preview the resulting balances before saving a split,  
**so that** I can verify the calculation.

---

## SPLIT-007 — Split within a group or event

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to split a cost among selected participants,  
**so that** shared expenses can be managed in their proper context.

---

# 13. Requests and Approvals

## REQUEST-001 — View incoming requests

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view requests requiring my attention,  
**so that** changes involving me cannot happen invisibly.

Possible request types include:

- member-link requests;
- newly proposed collaborative debts;
- debt edits;
- debt cancellations;
- repayment confirmations;
- group invitations;
- membership changes;
- group-detail changes where approval is required; and
- split-expense proposals.

---

## REQUEST-002 — Accept a request

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to accept a valid request,  
**so that** the proposed change can take effect.

---

## REQUEST-003 — Reject a request

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to reject a request,  
**so that** I remain in control of collaborative records affecting me.

---

## REQUEST-004 — View outgoing requests

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see requests I have sent,  
**so that** I know which actions are still pending.

---

## REQUEST-005 — Cancel a pending request

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to cancel an applicable pending request I created,  
**so that** an outdated proposal cannot later be accepted accidentally.

---

## REQUEST-006 — View request history

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to see completed, rejected, cancelled, and expired requests,  
**so that** collaborative changes are traceable.

---

# 14. Reminders and Notifications

## REMINDER-001 — Send a reminder for a debt

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to send a reminder to a linked member about a specific debt,  
**so that** I can follow up without leaving Debtulator.

---

## REMINDER-002 — Send a balance reminder

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to remind a linked member about multiple outstanding debts or their total balance with me,  
**so that** I can follow up efficiently.

---

## REMINDER-003 — Prevent reminder abuse

**Actor:** Linked Member  
**Priority:** P1  
**Implementation status:**

**As a** **Linked Member**,
**I want** protections against excessive or abusive reminders,  
**so that** the feature cannot easily be used for harassment.

Possible protections include:

- rate limits;
- notification preferences;
- blocking;
- reporting; and
- cooldowns.

---

## NOTIFY-001 — Receive important notifications

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to receive relevant notifications,  
**so that** I do not miss important debt or collaboration activity.

Events may include:

- incoming requests;
- accepted or rejected requests;
- due debts;
- reminders;
- group invitations;
- group membership changes;
- collaborative debt changes; and
- security-sensitive account events.

---

## NOTIFY-002 — Manage notification preferences

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to choose which non-essential notifications I receive,  
**so that** Debtulator remains useful without becoming intrusive.

Security-critical notifications may not be fully disableable.

---

# 15. Groups and Events

## GROUP-001 — Create a group or event

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to create a shared group or event,  
**so that** related members, debts, and expenses can be organised together.

Examples include:

- a household;
- holiday;
- trip;
- dinner;
- shared project;
- recurring social group; or
- one-time event.

---

## GROUP-002 — View my groups and events

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view groups and events I belong to,  
**so that** I can access their shared financial activity.

---

## GROUP-003 — View group details

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to view group information, membership, balances, debts, and expenses,  
**so that** I understand the group's current state.

---

## GROUP-004 — Edit group details

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to edit group or event details,  
**so that** the workspace remains accurate.

---

## GROUP-005 — Invite linked users

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to invite linked Debtulator users,  
**so that** they can participate in a group or event.

---

## GROUP-006 — Add unlinked participants

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to represent people who do not use Debtulator,  
**so that** group calculations can still include everyone involved.

---

## GROUP-007 — Accept or reject a group invitation

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to accept or reject group invitations,  
**so that** I control which shared spaces I join.

---

## GROUP-008 — Add debts within a group

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to create debts in the context of the group,  
**so that** shared financial activity stays organised.

---

## GROUP-009 — Add split expenses within a group

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to add a split expense to selected participants,  
**so that** shared costs can be calculated automatically.

---

## GROUP-010 — Edit collaborative group records

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to propose or perform valid edits to group financial records,  
**so that** mistakes can be corrected without losing accountability.

---

## GROUP-011 — Add members to a group

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to add or invite additional participants,  
**so that** the group can evolve.

---

## GROUP-012 — Remove members from a group

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to remove a participant when permitted,  
**so that** membership stays accurate.

Removal must not destroy legitimate financial history or obligations.

---

## GROUP-013 — Leave a group

**Actor:** Group or Event Participant  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to leave a group when permitted,  
**so that** I am not permanently tied to an inactive or unwanted group.

Outstanding obligations must be handled clearly.

---

## GROUP-014 — Group roles and permissions

**Actor:** Group or Event Manager  
**Priority:** P2  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** appropriate roles and permissions,  
**so that** administrative actions can be delegated safely.

Possible roles may include:

- owner;
- manager;
- participant; and
- read-only participant.

Exact roles should be driven by real product requirements rather than created unnecessarily.

---

## GROUP-015 — Archive a group or event

**Actor:** Group or Event Manager  
**Priority:** P1  
**Implementation status:**

**As a** **Group or Event Manager**,
**I want** to archive a completed or inactive group,  
**so that** historical records remain accessible without cluttering active groups.

---

# 16. Attachments and Supporting Documents

## ATTACH-001 — Attach a receipt or document to a debt

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to attach supporting files to a debt,  
**so that** relevant evidence or context is stored with the record.

---

## ATTACH-002 — Attach files to a group or event

**Actor:** Group or Event Participant  
**Priority:** P2  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to attach relevant documents to the group or event,  
**so that** shared supporting material is easy to find.

---

## ATTACH-003 — Associate supporting files with a member relationship

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to associate permitted supporting documents with a member relationship,  
**so that** broader records can be retained where appropriate.

---

## ATTACH-004 — Secure file access

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** attachments to be visible only to authorised people,  
**so that** private documents are not exposed.

---

## ATTACH-005 — Safe file handling

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** uploaded files to be validated and handled safely,  
**so that** malicious or unsupported files cannot compromise the service.

---

# 17. Reports and Analytics for Users

## REPORT-001 — View debt analytics

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** reports summarising my debts,  
**so that** I can understand my financial relationships over time.

Possible insights include:

- amount owed;
- amount receivable;
- net balance;
- repayments;
- overdue debts;
- trends over time;
- balances by member;
- balances by group;
- debt status; and
- currency.

---

## REPORT-002 — View member analytics

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to understand my debt history with individual members,  
**so that** I can review our financial relationship.

---

## REPORT-003 — View group analytics

**Actor:** Group or Event Participant  
**Priority:** P2  
**Implementation status:**

**As a** **Group or Event Participant**,
**I want** to view permitted group-level financial summaries,  
**so that** I understand shared spending and balances.

---

## REPORT-004 — Choose a reporting period

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to select a date range,  
**so that** reports reflect the period I care about.

---

## EXPORT-001 — Export debt data

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to export organised debt data,  
**so that** I can archive, analyse, or share my records outside Debtulator.

Potential formats may include:

- CSV;
- spreadsheet-compatible formats;
- PDF summaries; and
- structured machine-readable exports.

---

## EXPORT-002 — Export filtered reports

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** exports to respect selected filters and date ranges,  
**so that** I can produce useful targeted reports.

---

# 18. Search and Navigation

## SEARCH-001 — Global search

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to search across relevant Debtulator records,  
**so that** I can quickly find debts, members, groups, and activity.

---

## SEARCH-002 — Consistent filtering

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** filters to behave predictably across lists,  
**so that** I can navigate large datasets efficiently.

---

## SEARCH-003 — Preserve useful list state

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** the app to preserve useful navigation and filter state where appropriate,  
**so that** returning to a list does not unnecessarily reset my workflow.

---

# 19. Offline, Synchronisation, and Multi-Device Behaviour

These stories define **user-visible expectations**, not a specific implementation architecture.

## SYNC-001 — Use core records during temporary connectivity loss

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** previously available core debt and member information to remain usable when connectivity is temporarily unavailable,  
**so that** Debtulator does not become useless because of a poor connection.

---

## SYNC-002 — Save valid changes during temporary connectivity loss

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** supported changes to be saved locally and synchronised when possible,  
**so that** I can keep working without losing data.

---

## SYNC-003 — Synchronise between devices

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** my account-backed Debtulator records to synchronise across my devices,  
**so that** I see a consistent state.

---

## SYNC-004 — Resolve conflicting changes safely

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** concurrent or conflicting updates to be handled predictably,  
**so that** valid financial information is not silently lost.

### Acceptance criteria

- The system must not silently overwrite meaningful financial changes without a defined conflict strategy.
- Collaborative records must respect server-authoritative permissions and validation.
- Users should receive understandable feedback when intervention is required.

---

## SYNC-005 — Show synchronisation problems

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to know when an important change has not synchronised successfully,  
**so that** I do not assume another person or device has received it.

---

# 20. Activity and Auditability

## ACTIVITY-001 — View relevant account activity

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to view meaningful activity involving my records,  
**so that** I can understand what happened and when.

---

## AUDIT-001 — Preserve significant financial changes

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** important financial changes to remain traceable,  
**so that** current balances can be explained.

This does not mean every UI edit must expose a technical audit log. It means the system should not make financially meaningful history impossible to reconstruct.

---

## AUDIT-002 — Identify collaborative actors

**Actor:** Linked Member  
**Priority:** P1  
**Implementation status:**

**As a** **Linked Member**,
**I want** important shared actions to identify who initiated or approved them,  
**so that** responsibility is clear.

---

# 21. Accessibility and Internationalisation

## ACCESS-001 — Use Debtulator with assistive technology

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** core Debtulator workflows to be accessible,  
**so that** I can manage debts independently.

The product should target applicable modern accessibility guidance, including WCAG principles where relevant.

---

## ACCESS-002 — Use dynamic text sizes

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** important interfaces to respect supported system text-sizing behaviour,  
**so that** information remains readable.

---

## ACCESS-003 — Do not rely on colour alone

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** financial states to be communicated through more than colour,  
**so that** I can understand the interface accurately.

---

## I18N-001 — Display locale-aware dates and numbers

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** dates and numeric values formatted appropriately for my locale,  
**so that** financial information is easy to read.

---

## I18N-002 — Support multiple currencies

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** debts to retain their actual currency,  
**so that** obligations are represented correctly.

---

## I18N-003 — Handle currency conversion transparently

**Actor:** Authenticated User  
**Priority:** P2  
**Implementation status:**

**As an** **Authenticated User**,
**I want** any converted summaries to clearly state the conversion basis,  
**so that** approximate values are not mistaken for the original obligation.

---

# 22. Safety, Abuse Prevention, and Trust

## TRUST-001 — Report abusive users or activity

**Actor:** Authenticated User  
**Priority:** P1  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to report abusive or suspicious interactions,  
**so that** misuse can be investigated.

---

## TRUST-002 — Prevent unauthorised debt creation from becoming accepted truth

**Actor:** Linked Member  
**Priority:** P1  
**Implementation status:**

**As a** **Linked Member**,
**I want** debts created by another person involving me to be clearly distinguished as proposed, pending, accepted, or otherwise governed by defined collaboration rules,  
**so that** another user cannot unilaterally create an authoritative obligation against me.

---

## TRUST-003 — Limit user enumeration

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** account discovery to avoid exposing unnecessary information,  
**so that** attackers cannot easily enumerate registered users.

---

## TRUST-004 — Protect sensitive actions

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:** [PI]

**As an** **Authenticated User**,
**I want** sensitive account actions to require appropriate re-authentication or verification,  
**so that** a stolen session cannot easily compromise my account.

Sensitive actions may include:

- changing key identity information;
- changing authentication methods;
- deleting the account;
- exporting sensitive personal information; and
- future real-money payment operations.

---

# 23. Administrator and Manager Stories

Administrative functionality must follow **least privilege**, **purpose limitation**, **auditability**, applicable law, and organisational security policies.

Being an administrator must never automatically mean unrestricted access to all private user content.

## ADMIN-001 — Search and identify user accounts

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** to locate user accounts using approved identifiers,  
**so that** I can perform legitimate support, security, or operational work.

---

## ADMIN-002 — View permitted account information

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** to view only the user information required for my administrative role,  
**so that** I can support the service without unnecessary exposure of private data.

---

## ADMIN-003 — Make lawful administrative account changes

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** to perform specifically permitted account-management actions,  
**so that** legitimate support and security issues can be resolved.

### Acceptance criteria

- Permissions are role-based or otherwise explicitly authorised.
- Sensitive actions are audited.
- High-risk actions may require elevated approval.
- Administrative controls must not bypass legal or security requirements merely for convenience.

---

## ADMIN-004 — Suspend or restrict abusive accounts

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** to restrict accounts that violate applicable rules or create security risks,  
**so that** other users and the service can be protected.

---

## ADMIN-005 — Review abuse reports

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** to review user-submitted reports with appropriate context,  
**so that** abuse can be investigated consistently.

---

## ADMIN-006 — View administrative audit logs

**Actor:** Administrator  
**Priority:** P0  
**Implementation status:**

**As an** **Administrator**,
**I want** administrative access and sensitive actions to be logged,  
**so that** misuse can be detected and investigated.

---

# 24. Product Analytics and Operations

Product analytics should collect only information that has a legitimate defined purpose and should follow applicable privacy law, platform rules, retention policies, consent requirements, and data-minimisation principles.

## ANALYTICS-001 — View active-user metrics

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** aggregated usage metrics,  
**so that** I can understand whether Debtulator is useful and growing.

Possible metrics include:

- daily active users;
- weekly active users;
- monthly active users;
- retention;
- feature adoption;
- session frequency; and
- conversion through major onboarding flows.

---

## ANALYTICS-002 — Understand feature usage

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** aggregated feature-usage analytics,  
**so that** product decisions can be based on evidence.

---

## ANALYTICS-003 — Understand app lifecycle metrics

**Actor:** Administrator  
**Priority:** P1  
**Implementation status:**

**As an** **Administrator**,
**I want** available privacy-compliant metrics for installs, re-installs, updates, crashes, and uninstall-related signals where platform data legitimately supports them,  
**so that** I can understand product health.

Debtulator should not promise technically impossible precision for events such as app deletion if the operating system or app-store platform does not expose reliable user-level data.

---

## ANALYTICS-004 — Monitor reliability

**Actor:** Administrator  
**Priority:** P0  
**Implementation status:**

**As an** **Administrator**,
**I want** visibility into crashes, failed synchronisation, API failures, and performance problems,  
**so that** production issues can be detected and corrected.

---

## ANALYTICS-005 — Minimise analytics data

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** product analytics to avoid collecting unnecessary private debt information,  
**so that** ordinary service measurement does not expose sensitive financial relationships.

---

# 25. Data Integrity and Financial Correctness

## DATA-001 — Preserve monetary precision

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** amounts and balances to remain mathematically accurate,  
**so that** Debtulator never changes what I owe because of rounding or numeric-storage errors.

---

## DATA-002 — Prevent invalid financial states

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** Debtulator to reject impossible or malformed financial records,  
**so that** corrupted balances are not created.

---

## DATA-003 — Preserve referential history

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** deleting or unlinking entities to avoid corrupting related financial history,  
**so that** old records remain understandable.

---

## DATA-004 — Handle duplicate operations safely

**Actor:** Authenticated User  
**Priority:** P0  
**Implementation status:**

**As an** **Authenticated User**,
**I want** retries caused by poor connectivity to avoid creating duplicate debts, payments, requests, or other financial operations,  
**so that** synchronisation cannot accidentally change my balance.

---

# 26. Future Real-Money Payments

> **Status: Future — Regulated**
>
> These capabilities are explicitly separate from Debtulator's payment-recording functionality.
>
> They should not be enabled until legal, regulatory, security, fraud, identity, payment-provider, operational, and jurisdiction-specific requirements have been properly addressed.

## REALPAY-001 — Pay another linked member

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to send real money to an eligible linked member through Debtulator,  
**so that** I can settle obligations without leaving the app.

---

## REALPAY-002 — Settle a debt with a real payment

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** to initiate a real payment for the remaining balance of an eligible debt,  
**so that** the debt can be settled securely.

---

## REALPAY-003 — Use trusted payment infrastructure

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** real payments to use reputable, legally compliant banking or payment services,  
**so that** Debtulator does not unnecessarily handle sensitive financial infrastructure itself.

---

## REALPAY-004 — Confirm payment state accurately

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** Debtulator to distinguish initiated, pending, successful, failed, reversed, refunded, and disputed payment states,  
**so that** a debt is not incorrectly marked as settled.

---

## REALPAY-005 — Protect against fraud

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** high-risk payment activity to use appropriate fraud and authentication protections,  
**so that** unauthorised transfers are harder to perform.

---

## REALPAY-006 — Support jurisdiction-specific eligibility

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** real-payment functionality to be offered only where I and the recipient are legally and operationally eligible,  
**so that** the service operates lawfully.

---

## REALPAY-007 — Handle payment disputes and reversals

**Actor:** Authenticated User  
**Priority:** Future — Regulated  
**Implementation status:**

**As an** **Authenticated User**,
**I want** failed, reversed, disputed, or refunded transactions to update Debtulator correctly,  
**so that** financial records match the actual payment outcome.

---

# 27. Recommended Release Slices

This section groups stories into practical product milestones. It does **not** require the engineering implementation to follow these exact releases.

## Release A — Core personal ledger

Primary goal: Debtulator works extremely well even if no other person has the app.

Includes primarily:

- account creation, login, logout, and password recovery;
- basic profile and account management;
- member creation and editing;
- debt creation, viewing, editing, filtering, and settlement;
- recorded repayments;
- overview balances;
- history and data integrity;
- local/offline continuity;
- account-backed synchronisation;
- accessibility fundamentals; and
- privacy/security fundamentals.

---

## Release B — Linked users and collaboration

Primary goal: two real Debtulator users can safely share debt-related workflows.

Includes primarily:

- user discovery;
- member linking;
- direct linked-member creation;
- QR linking;
- link requests;
- collaborative debt requests and approvals;
- reminders;
- notifications;
- activity history;
- blocking and abuse protection; and
- appropriate collaborative auditability.

---

## Release C — Groups and split expenses

Primary goal: Debtulator supports trips, households, events, and shared spending.

Includes primarily:

- groups and events;
- invitations and membership management;
- split expenses;
- participant balances;
- group debts;
- group activity;
- group archival; and
- permissions where actually required.

---

## Release D — Insights and portability

Primary goal: users can understand and extract their financial history.

Includes primarily:

- reports;
- member analytics;
- group analytics;
- date ranges;
- exports;
- personal-data exports; and
- improved search.

---

## Release E — Supporting documents

Primary goal: debts and groups can carry documentary context.

Includes primarily:

- receipts;
- documents;
- attachment permissions;
- secure storage;
- validation and malware protections; and
- attachment lifecycle management.

---

## Release F — Real-money settlement

Primary goal: eligible users can settle debts using regulated payment infrastructure.

This phase requires separate legal, compliance, security, fraud, provider, operational, and jurisdictional design before implementation.

---

# 28. Core Business Definitions

## Debt

A financial obligation represented in Debtulator indicating that one party owes an amount to another party.

## Outstanding Balance

The portion of a debt that remains unpaid according to Debtulator's records.

## Recorded Payment

A record stating that a payment occurred outside Debtulator or otherwise needs to be represented in the ledger.

A recorded payment is **not proof that Debtulator processed the money**.

## Settlement

The state reached when a debt's remaining balance becomes zero through valid repayment, adjustment, cancellation, or future regulated payment behaviour.

## Member

A person with whom the current user can have Debtulator records.

## Unlinked Member

A member controlled as part of the current user's personal records and not yet securely associated with another Debtulator account.

## Linked Member

A member associated with a real Debtulator account through an approved linking process.

## Group / Event

A shared financial context containing participants and related debts, splits, activity, or other records.

## Request

A proposed collaborative action awaiting a response from another user or authorised participant.

---

# 29. Product Rules Requiring Explicit Decisions

The following areas should be resolved deliberately before their corresponding features are implemented.

### Collaborative debt authority

Define which changes:

- happen immediately;
- require acceptance;
- require confirmation;
- may be rejected;
- may be corrected later; or
- remain personal-only.

### Linking existing records

Define which historical debts become shared when an unlinked member is linked to a real account.

Historical personal records should **not automatically become visible to another person without a clear rule and user expectation**.

### General member repayments

Define how a payment recorded against a member is allocated:

- oldest debt first;
- user-selected debts;
- proportional allocation;
- as an independent balance adjustment; or
- another explicit model.

### Debt deletion

Define the distinction between:

- deleting an accidental draft;
- cancelling a valid debt;
- archiving;
- correcting a debt; and
- preserving financial history.

### Group ownership and permissions

Do not introduce a complex role model until actual product behaviour requires one.

### Currency conversion

Define whether Debtulator:

- never converts currencies;
- displays optional estimates;
- stores user-defined exchange rates; or
- obtains market exchange rates.

Original debt amounts and currencies should always remain preserved.

### Identity and discoverability

Define which identifiers can be searched and which require exact matching, consent, or prior sharing.

### Retention

Define retention policies for:

- deleted accounts;
- collaborative history;
- audit logs;
- attachments;
- analytics;
- security logs; and
- future payment records.

---

# 30. Definition of Done for User-Facing Features

A user story should not be treated as production-complete solely because its happy-path UI works.

Where relevant, completion should include:

- authenticated and unauthenticated behaviour;
- authorisation;
- input validation;
- loading states;
- empty states;
- error states;
- offline or retry behaviour;
- synchronisation behaviour;
- duplicate-request protection;
- accessibility;
- analytics where justified;
- privacy review;
- security review;
- destructive-action handling;
- audit/history behaviour;
- automated tests appropriate to risk; and
- clear user-visible wording for financially significant actions.

---

# 31. Non-Goals for the Initial Product

Unless separately prioritised, Debtulator's early releases should **not** attempt to become:

- a bank;
- a stored-value wallet;
- an accounting platform for businesses;
- a lending or credit-underwriting service;
- a collections agency;
- a cryptocurrency product;
- a replacement for legally binding contracts;
- a full invoicing platform; or
- a general-purpose social network.

The core product is a reliable personal and collaborative debt ledger.

---

# 32. Summary of Recommended Priorities

## P0 — Core

- authentication;
- password recovery;
- account/profile basics;
- privacy and security fundamentals;
- members;
- debts;
- recorded payments;
- settlement;
- search/filter basics;
- debt/member detail views;
- multi-currency correctness;
- local/offline continuity;
- synchronisation;
- data integrity;
- audit-preserving financial behaviour;
- accessibility fundamentals; and
- production reliability.

## P1 — Collaboration & Growth

- third-party authentication;
- member linking;
- user discovery;
- QR linking;
- requests and approvals;
- reminders;
- notifications;
- blocking/reporting;
- groups and events;
- split expenses;
- reports;
- exports;
- activity feeds;
- user privacy controls;
- admin operations; and
- privacy-conscious product analytics.

## P2 — Advanced

- attachments;
- recurring debts;
- advanced split methods;
- richer group roles;
- global search;
- group analytics;
- advanced exports;
- currency conversion estimates; and
- deeper historical reporting.

## Future — Regulated

- real-money transfers;
- in-app debt settlement through money movement;
- payment-provider integration;
- identity or compliance checks where required;
- fraud controls;
- dispute handling; and
- jurisdiction-specific financial operations.

---

# 33. Product Requirement Authority

This document should be treated as the baseline **user-story and product-behaviour reference** for Debtulator.

When implementation questions arise:

1. preserve the user intent defined here;
2. avoid introducing capabilities that contradict these stories;
3. avoid exposing private or collaborative data merely because doing so simplifies implementation;
4. preserve financial correctness and traceability;
5. add implementation detail in architecture or technical-design documents rather than overloading user stories; and
6. update this document when product behaviour changes materially.
