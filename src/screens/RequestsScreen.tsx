import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DebtRow } from '@/src/components/EntityRows';
import { Badge } from '@/src/components/ui/Badges';
import { Amount } from '@/src/components/ui/Money';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Screen,
  SectionTitle,
  TextField,
} from '@/src/components/ui/Primitives';
import { palette, spacing } from '@/src/constants/design';
import { respondRemoteDebtVerification, updateRemoteLinkRequest } from '@/src/services/stage2Sync';
import { updateRemoteEventInvite } from '@/src/services/stage3Sync';
import { useAppData } from '@/src/state/AppDataProvider';
import { useAuth } from '@/src/state/AuthProvider';
import type { CurrencyCode, DebtVerification, LinkRequest } from '@/src/types/models';

export function RequestsScreen() {
  const data = useAppData();
  const auth = useAuth();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const userId = auth.identity.authenticatedUserId;
  const email = auth.identity.email?.toLowerCase() ?? null;

  const incomingLinks = useMemo(
    () =>
      data.linkRequests.filter(
        (request) =>
          request.status === 'pending' &&
          ((userId && request.targetUserId === userId) ||
            (email && request.targetEmail?.toLowerCase() === email)),
      ),
    [data.linkRequests, email, userId],
  );
  const outgoingLinks = useMemo(
    () => data.linkRequests.filter((request) => request.requesterUserId === userId),
    [data.linkRequests, userId],
  );
  const incomingVerifications = useMemo(
    () => data.debtVerifications.filter((verification) => verification.status === 'pending' && verification.responderUserId === userId),
    [data.debtVerifications, userId],
  );
  const outgoingVerifications = useMemo(
    () => data.debtVerifications.filter((verification) => verification.requesterUserId === userId && verification.status === 'pending'),
    [data.debtVerifications, userId],
  );
  const incomingEventInvites = useMemo(
    () =>
      data.eventInvites.filter(
        (invite) =>
          invite.status === 'pending' &&
          ((userId && invite.invitedUserId === userId) ||
            (email && invite.invitedEmail?.toLowerCase() === email)),
      ),
    [data.eventInvites, email, userId],
  );
  const outgoingEventInvites = useMemo(
    () => data.eventInvites.filter((invite) => invite.inviterUserId === userId),
    [data.eventInvites, userId],
  );
  const eventClaimsForApproval = useMemo(() => {
    const manageableEventIds = new Set(
      data.eventParticipants
        .filter((participant) => participant.userId === userId && participant.status === 'active' && ['owner', 'admin'].includes(participant.role))
        .map((participant) => participant.eventId),
    );
    data.events.filter((event) => event.ownerUserId === userId).forEach((event) => manageableEventIds.add(event.id));
    return data.eventMemberClaims.filter((claim) => claim.status === 'pending' && manageableEventIds.has(claim.eventId));
  }, [data.eventMemberClaims, data.eventParticipants, data.events, userId]);
  const ownEventClaims = useMemo(
    () => data.eventMemberClaims.filter((claim) => claim.claimantUserId === userId),
    [data.eventMemberClaims, userId],
  );
  const eventVerificationEntries = useMemo(() => {
    const linkedMemberIds = new Set(
      data.sharedEventMembers
        .filter((member) => member.linkedUserId === userId && member.status !== 'merged')
        .map((member) => member.id),
    );
    return data.ledgerEntries.filter(
      (entry) =>
        entry.visibility === 'shared_event' &&
        (linkedMemberIds.has(entry.fromId) || linkedMemberIds.has(entry.toId)) &&
        ['pending', 'partially_verified'].includes(entry.verificationStatus),
    );
  }, [data.ledgerEntries, data.sharedEventMembers, userId]);
  const rejectedDebts = data.debts.filter((debt) => debt.verificationStatus === 'rejected' || debt.verificationStatus === 'disputed');
  const rejectedEventEntries = data.ledgerEntries.filter(
    (entry) => entry.visibility === 'shared_event' && ['rejected', 'disputed'].includes(entry.verificationStatus),
  );

  if (data.loading || auth.loading) {
    return <LoadingState />;
  }

  return (
    <Screen>
      <PageHeader
        eyebrow="Requests"
        title="Requests"
        subtitle="Member links, debt verification, rejected debts, and dispute follow-up."
        action={<Button title={auth.user ? 'Account' : 'Sign in'} icon="person-circle" onPress={() => router.push('/auth')} />}
      />

      {!auth.user ? (
        <Card tone="amber">
          <SectionTitle title="Signed-out mode" subtitle="Local debts still work without an account." />
          <Text style={styles.body}>Sign in to receive link requests and verify debts shared by linked members.</Text>
          <Button title="Sign in or create account" icon="log-in" onPress={() => router.push('/auth')} />
        </Card>
      ) : null}

      <SectionTitle title="Incoming member links" subtitle="Accepting links identity only, not historical debts." />
      <Card>
        {incomingLinks.length > 0 ? (
          incomingLinks.map((request) => (
            <LinkRequestRow
              key={request.id}
              request={request}
              primaryAction="Accept"
              onAccept={async () => {
                await updateRemoteLinkRequest(request, 'accepted', userId);
                await data.respondToLinkRequest(request.id, 'accepted', userId ?? 'me');
              }}
              onReject={async () => {
                await updateRemoteLinkRequest(request, 'rejected', userId);
                await data.respondToLinkRequest(request.id, 'rejected', userId ?? 'me');
              }}
            />
          ))
        ) : (
          <EmptyState title="No incoming link requests" body="Incoming member link invitations will appear here." />
        )}
      </Card>

      <SectionTitle title="Incoming debt verification" subtitle="Verify or reject debts shared with you." />
      <Card>
        {incomingVerifications.length > 0 ? (
          incomingVerifications.map((verification) => {
            const debt = data.debts.find((item) => item.id === verification.debtId);
            const member = debt ? data.members.find((item) => item.id === debt.memberId) : undefined;
            return (
              <VerificationRequestRow
                key={verification.id}
                verification={verification}
                title={debt?.title ?? 'Shared debt'}
                amount={debt?.amount ?? 0}
                currency={debt?.currency ?? data.settings.baseCurrency}
                detail={
                  debt
                    ? `${member?.displayName ?? 'Linked member'} ${debt.direction === 'they_owe_me' ? 'is marked as debtor' : 'is marked as creditor'} · ${debt.debtDate}`
                    : 'Remote verification request'
                }
                rejectionReason={rejectionReasons[verification.id] ?? ''}
                onReasonChange={(value) => setRejectionReasons((current) => ({ ...current, [verification.id]: value }))}
                onVerify={async () => {
                  if (!debt || !userId) {
                    return;
                  }
                  await respondRemoteDebtVerification({ verification, status: 'verified' });
                  await data.respondToDebtVerification(verification.id, 'verified', userId);
                }}
                onReject={async () => {
                  if (!debt || !userId) {
                    return;
                  }
                  const reason = rejectionReasons[verification.id] ?? '';
                  await respondRemoteDebtVerification({ verification, status: 'rejected', rejectionReason: reason });
                  await data.respondToDebtVerification(verification.id, 'rejected', userId, reason);
                }}
              />
            );
          })
        ) : (
          <EmptyState title="No incoming verification" body="Linked members can send debt verification requests here." />
        )}
      </Card>

      <SectionTitle title="Event invites" subtitle="Incoming and outgoing shared event invitations." />
      <Card>
        {incomingEventInvites.map((invite) => {
          const event = data.events.find((item) => item.id === invite.eventId);
          return (
            <View key={invite.id} style={styles.requestBlock}>
              <View style={styles.rowBetween}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{event?.name ?? invite.invitedDisplayName}</Text>
                  <Text style={styles.body}>Role offered: {invite.offeredRole}</Text>
                  {invite.message ? <Text style={styles.body}>{invite.message}</Text> : null}
                </View>
                <Badge label={invite.status} tone="amber" />
              </View>
              <View style={styles.buttonRow}>
                <Button
                  title="Accept"
                  icon="checkmark-circle"
                  onPress={async () => {
                    if (!userId) {
                      return;
                    }
                    await updateRemoteEventInvite(invite, 'accepted', userId);
                    await data.respondToEventInvite(invite.id, 'accepted', userId, auth.identity.displayName, auth.identity.email);
                  }}
                />
                <Button
                  title="Reject"
                  icon="close-circle"
                  variant="secondary"
                  onPress={async () => {
                    if (!userId) {
                      return;
                    }
                    await updateRemoteEventInvite(invite, 'rejected', userId);
                    await data.respondToEventInvite(invite.id, 'rejected', userId);
                  }}
                />
              </View>
            </View>
          );
        })}
        {outgoingEventInvites.map((invite) => (
          <View key={invite.id} style={styles.requestBlock}>
            <View style={styles.rowBetween}>
              <View style={styles.flexOne}>
                <Text style={styles.rowTitle}>{invite.invitedDisplayName}</Text>
                <Text style={styles.body}>Shared event invite · {invite.invitedEmail ?? invite.invitedPhone ?? invite.invitedUserId ?? 'Debtulator user'}</Text>
              </View>
              <Badge label={invite.status} tone={invite.status === 'pending' ? 'amber' : 'neutral'} />
            </View>
            {invite.status === 'pending' ? (
              <Button
                title="Cancel invite"
                icon="close-circle"
                variant="secondary"
                onPress={async () => {
                  await updateRemoteEventInvite(invite, 'cancelled', userId);
                  await data.respondToEventInvite(invite.id, 'cancelled', userId ?? 'me');
                }}
              />
            ) : null}
          </View>
        ))}
        {incomingEventInvites.length === 0 && outgoingEventInvites.length === 0 ? (
          <EmptyState title="No event invites" body="Shared event invitations will appear here." />
        ) : null}
      </Card>

      <SectionTitle title="Event claims" subtitle="Placeholder claims awaiting owner/admin review." />
      <Card>
        {eventClaimsForApproval.map((claim) => {
          const member = data.sharedEventMembers.find((item) => item.id === claim.eventMemberId);
          return (
            <View key={claim.id} style={styles.requestBlock}>
              <Text style={styles.rowTitle}>{member?.displayName ?? 'Event member'}</Text>
              <Text style={styles.body}>{claim.claimantUserId} wants to claim this member.</Text>
              {claim.message ? <Text style={styles.body}>{claim.message}</Text> : null}
              <View style={styles.buttonRow}>
                <Button
                  title="Approve claim"
                  icon="checkmark-circle"
                  onPress={() => userId && data.respondToEventMemberClaim(claim.id, 'approved', userId)}
                />
                <Button
                  title="Reject claim"
                  icon="close-circle"
                  variant="secondary"
                  onPress={() => userId && data.respondToEventMemberClaim(claim.id, 'rejected', userId)}
                />
              </View>
            </View>
          );
        })}
        {ownEventClaims.map((claim) => (
          <View key={claim.id} style={styles.requestBlock}>
            <Text style={styles.rowTitle}>Your claim request</Text>
            <Text style={styles.body}>{claim.status}</Text>
          </View>
        ))}
        {eventClaimsForApproval.length === 0 && ownEventClaims.length === 0 ? (
          <EmptyState title="No event claims" body="Claim requests for unlinked placeholders will appear here." />
        ) : null}
      </Card>

      <SectionTitle title="Event verification" subtitle="Shared event expenses and debts involving you." />
      <Card>
        {eventVerificationEntries.length > 0 ? (
          eventVerificationEntries.map((entry) => {
            const eventMember = data.sharedEventMembers.find(
              (member) => member.linkedUserId === userId && (entry.fromId === member.id || entry.toId === member.id),
            );
            const targetType = entry.kind === 'event_direct_debt' ? 'debt' : 'expense';
            const targetId = entry.kind === 'event_direct_debt' ? entry.sourceId : entry.expenseId ?? entry.sourceId;
            return (
              <View key={entry.id} style={styles.requestBlock}>
                <DebtRow
                  entry={entry}
                  members={data.members}
                  sharedEventMembers={data.sharedEventMembers}
                  event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
                />
                <TextField
                  label="Rejection reason"
                  value={rejectionReasons[entry.id] ?? ''}
                  onChangeText={(value) => setRejectionReasons((current) => ({ ...current, [entry.id]: value }))}
                  multiline
                />
                <View style={styles.buttonRow}>
                  <Button
                    title="Verify"
                    icon="shield-checkmark"
                    onPress={() =>
                      userId &&
                      eventMember &&
                      data.respondToEventVerification({
                        eventId: entry.eventId ?? '',
                        targetType,
                        targetId,
                        eventMemberId: eventMember.id,
                        linkedUserId: userId,
                        status: 'verified',
                      })
                    }
                  />
                  <Button
                    title="Reject"
                    icon="close-circle"
                    variant="danger"
                    disabled={!rejectionReasons[entry.id]?.trim()}
                    onPress={() =>
                      userId &&
                      eventMember &&
                      data.respondToEventVerification({
                        eventId: entry.eventId ?? '',
                        targetType,
                        targetId,
                        eventMemberId: eventMember.id,
                        linkedUserId: userId,
                        status: 'rejected',
                        rejectionReason: rejectionReasons[entry.id],
                      })
                    }
                  />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState title="No event verification" body="Event records involving you will appear here." />
        )}
      </Card>

      <SectionTitle title="Outgoing requests" subtitle="Pending links and verification requests you sent." />
      <Card>
        {outgoingLinks.map((request) => (
          <LinkRequestRow
            key={request.id}
            request={request}
            primaryAction="Cancel"
            onReject={async () => {
              await updateRemoteLinkRequest(request, 'cancelled', userId);
              await data.respondToLinkRequest(request.id, 'cancelled', userId ?? 'me');
            }}
          />
        ))}
        {outgoingVerifications.map((verification) => {
          const debt = data.debts.find((item) => item.id === verification.debtId);
          return debt ? (
            <View key={verification.id} style={styles.requestBlock}>
              <View style={styles.rowBetween}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{debt.title}</Text>
                  <Text style={styles.body}>Pending verification from linked member.</Text>
                </View>
                <Badge label="pending" tone="amber" />
              </View>
              <Button
                title="Cancel request"
                icon="close-circle"
                variant="secondary"
                onPress={() => data.cancelDebtVerification(debt.id, userId)}
              />
            </View>
          ) : null;
        })}
        {outgoingLinks.length === 0 && outgoingVerifications.length === 0 ? (
          <EmptyState title="No outgoing requests" body="Link and verification requests you send will appear here." />
        ) : null}
      </Card>

      <SectionTitle title="Rejected and disputed" subtitle="Excluded from shared verified balances by default." />
      <Card>
        {rejectedDebts.length > 0 || rejectedEventEntries.length > 0 ? (
          <>
            {rejectedDebts.map((debt) => {
              const entry = data.ledgerEntries.find((item) => item.sourceId === debt.id);
              return entry ? (
                <DebtRow
                  key={debt.id}
                  entry={entry}
                  members={data.members}
                  sharedEventMembers={data.sharedEventMembers}
                  event={debt.eventId ? data.events.find((event) => event.id === debt.eventId) : undefined}
                />
              ) : null;
            })}
            {rejectedEventEntries.map((entry) => (
              <DebtRow
                key={entry.id}
                entry={entry}
                members={data.members}
                sharedEventMembers={data.sharedEventMembers}
                event={entry.eventId ? data.events.find((event) => event.id === entry.eventId) : undefined}
              />
            ))}
          </>
        ) : (
          <EmptyState title="No rejected debts" body="Rejected and disputed records stay visible here for review." />
        )}
      </Card>
    </Screen>
  );
}

function LinkRequestRow({
  request,
  primaryAction,
  onAccept,
  onReject,
}: {
  request: LinkRequest;
  primaryAction: 'Accept' | 'Cancel';
  onAccept?: () => void;
  onReject?: () => void;
}) {
  return (
    <View style={styles.requestBlock}>
      <View style={styles.rowBetween}>
        <View style={styles.flexOne}>
          <Text style={styles.rowTitle}>{request.requesterLabel}</Text>
          <Text style={styles.body}>
            Target: {request.targetEmail ?? request.targetPhone ?? request.targetUserId ?? 'Debtulator user'}
          </Text>
          {request.message ? <Text style={styles.body}>{request.message}</Text> : null}
        </View>
        <Badge label={request.status} tone={request.status === 'pending' ? 'amber' : 'neutral'} />
      </View>
      <View style={styles.buttonRow}>
        {primaryAction === 'Accept' ? (
          <Button title="Accept" icon="checkmark-circle" onPress={onAccept ?? (() => undefined)} />
        ) : null}
        <Button
          title={primaryAction === 'Cancel' ? 'Cancel' : 'Reject'}
          icon={primaryAction === 'Cancel' ? 'close-circle' : 'close'}
          variant="secondary"
          onPress={onReject ?? (() => undefined)}
        />
      </View>
    </View>
  );
}

function VerificationRequestRow({
  title,
  amount,
  currency,
  detail,
  rejectionReason,
  onReasonChange,
  onVerify,
  onReject,
}: {
  verification: DebtVerification;
  title: string;
  amount: number;
  currency: CurrencyCode;
  detail: string;
  rejectionReason: string;
  onReasonChange: (value: string) => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.requestBlock}>
      <View style={styles.rowBetween}>
        <View style={styles.flexOne}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.body}>{detail}</Text>
        </View>
        <Amount amount={amount} currency={currency} size="md" />
      </View>
      <TextField
        label="Rejection reason"
        value={rejectionReason}
        onChangeText={onReasonChange}
        placeholder="Required when rejecting"
        multiline
      />
      <View style={styles.buttonRow}>
        <Button title="Verify" icon="shield-checkmark" onPress={onVerify} />
        <Button title="Reject" icon="close-circle" variant="danger" onPress={onReject} disabled={!rejectionReason.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  requestBlock: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  flexOne: {
    flex: 1,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
