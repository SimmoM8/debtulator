package com.debtulator.backend.agreements;

import com.debtulator.backend.agreements.dto.AgreementRequestResponse;
import com.debtulator.backend.agreements.dto.AgreementStateResponse;
import com.debtulator.backend.debts.Debt;
import com.debtulator.backend.debts.DebtMapper;
import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.members.Member;
import com.debtulator.backend.members.MemberRepository;
import com.debtulator.backend.realtime.RealtimeEventPublisher;
import com.debtulator.backend.realtime.RealtimeEventTypes;
import com.debtulator.backend.sync.SyncChangeCommand;
import com.debtulator.backend.sync.SyncChangeWriter;
import com.debtulator.backend.sync.SyncEntityType;
import com.debtulator.backend.sync.SyncOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgreementService {
    private static final int MAX_REQUESTS = 100;
    private static final String DEBT = "debt";

    private final AgreementRepository agreementRepository;
    private final AgreementMapper agreementMapper;
    private final DebtCollaborationRepository collaborationRepository;
    private final DebtRepository debtRepository;
    private final MemberRepository memberRepository;
    private final DebtMapper debtMapper;
    private final SyncChangeWriter syncChangeWriter;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AgreementRequestResponse> getIncoming(UUID userId) {
        return agreementRepository.findPendingIncoming(userId, MAX_REQUESTS)
                .stream()
                .map(request -> agreementMapper.toResponse(request, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AgreementRequestResponse> getOutgoing(UUID userId) {
        return agreementRepository.findPendingOutgoing(userId, MAX_REQUESTS)
                .stream()
                .map(request -> agreementMapper.toResponse(request, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public AgreementRequestResponse getRequest(UUID userId, UUID requestId) {
        AgreementRequest request = agreementRepository
                .findForParticipant(requestId, userId)
                .orElseThrow(this::notFound);

        return agreementMapper.toResponse(request, userId);
    }

    @Transactional(readOnly = true)
    public List<AgreementRequestResponse> getAgreed(UUID userId) {
        return agreementRepository.findAcceptedForUser(userId, MAX_REQUESTS)
                .stream()
                .map(request -> agreementMapper.toResponse(request, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AgreementStateResponse> getStates(UUID userId) {
        return agreementRepository.findStatesForOwner(userId, MAX_REQUESTS)
                .stream()
                .map(state -> new AgreementStateResponse(
                        state.entityType(),
                        state.entityId(),
                        state.entityVersion(),
                        state.status(),
                        state.latestRequestId(),
                        state.updatedAt()
                ))
                .toList();
    }

    /**
     * Private ledger state is applied before collaboration is evaluated. This
     * method never rejects or rolls back a valid private edit merely because a
     * linked user has not agreed to it.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public AgreementProjection recordDebtMutation(
            UUID ownerUserId,
            Member member,
            Debt debt,
            String action
    ) {
        return recordDebtMutation(ownerUserId, member, debt, action, false);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordDeletedDebt(
            UUID ownerUserId,
            Member member,
            Debt debt
    ) {
        recordDebtMutation(ownerUserId, member, debt, "delete", true);
    }

    private AgreementProjection recordDebtMutation(
            UUID ownerUserId,
            Member member,
            Debt debt,
            String action,
            boolean deleted
    ) {
        Instant now = Instant.now(clock);
        supersedePending(ownerUserId, debt.getId(), now);

        DebtCollaboration collaboration = collaborationRepository
                .findByDebtId(debt.getId())
                .orElse(null);

        if (member.getLinkedUserId() == null) {
            AgreementProjection projection = collaboration == null
                    ? AgreementProjection.privateState()
                    : AgreementProjection.disagreed(
                            collaboration.id(),
                            collaboration.agreedRevision()
                    );
            persistProjection(debt, projection, null, now);
            return projection;
        }

        if (collaboration != null) {
            UUID expectedCounterparty = collaboration.otherUserId(ownerUserId);

            if (!expectedCounterparty.equals(member.getLinkedUserId())) {
                AgreementProjection projection = AgreementProjection.disagreed(
                        collaboration.id(),
                        collaboration.agreedRevision()
                );
                persistProjection(debt, projection, null, now);
                return projection;
            }

            if (matchesAgreedSnapshot(
                    collaboration,
                    debt,
                    ownerUserId,
                    expectedCounterparty,
                    deleted
            )) {
                AgreementProjection projection = AgreementProjection.agreed(
                        collaboration.id(),
                        collaboration.agreedRevision()
                );
                persistProjection(debt, projection, null, now);
                return projection;
            }
        } else if (deleted) {
            AgreementProjection projection = AgreementProjection.privateState();
            persistProjection(debt, projection, null, now);
            return projection;
        }

        UUID requestId = UUID.randomUUID();
        AgreementRequest request = new AgreementRequest(
                requestId,
                ownerUserId,
                member.getLinkedUserId(),
                DEBT,
                debt.getId(),
                debt.getVersion(),
                collaboration != null ? collaboration.id() : null,
                collaboration != null ? collaboration.agreedRevision() : null,
                collaboration == null ? "create" : action,
                debtMapper.toAgreementPayload(debt),
                "pending",
                now,
                null
        );

        agreementRepository.insert(request);

        AgreementProjection projection = AgreementProjection.pending(
                request.collaborationId(),
                request.baseAgreedRevision()
        );
        persistProjection(debt, projection, requestId, now);
        publishCreated(request);
        return projection;
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public AgreementRequestResponse accept(UUID targetUserId, UUID requestId) {
        AgreementRequest preview = agreementRepository
                .findForTarget(requestId, targetUserId)
                .orElseThrow(this::notFound);

        if (preview.isAccepted()) {
            return agreementMapper.toResponse(preview, targetUserId);
        }
        requirePending(preview);

        Debt lockedDebt = lockDebtForProposal(preview);

        AgreementRequest request = agreementRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(this::notFound);

        if (request.isAccepted()) {
            return agreementMapper.toResponse(request, targetUserId);
        }
        requirePending(request);
        validateLockedProposal(request, lockedDebt);

        Instant resolvedAt = Instant.now(clock);

        if (request.collaborationId() == null) {
            acceptInitialDebt(request, lockedDebt, resolvedAt);
        } else {
            acceptExistingDebt(request, lockedDebt, resolvedAt);
        }

        agreementRepository.updateStatus(request.id(), "accepted", resolvedAt);
        publishUpdated(request, "accepted", request.requesterUserId());

        return agreementMapper.toResponse(
                withStatus(request, "accepted", resolvedAt),
                targetUserId
        );
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public AgreementRequestResponse reject(UUID targetUserId, UUID requestId) {
        AgreementRequest preview = agreementRepository
                .findForTarget(requestId, targetUserId)
                .orElseThrow(this::notFound);

        if (preview.isRejected()) {
            return agreementMapper.toResponse(preview, targetUserId);
        }
        requirePending(preview);

        Debt lockedDebt = lockDebtForProposal(preview);

        AgreementRequest request = agreementRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(this::notFound);

        if (request.isRejected()) {
            return agreementMapper.toResponse(request, targetUserId);
        }
        requirePending(request);
        validateLockedProposal(request, lockedDebt);

        Instant resolvedAt = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "rejected", resolvedAt);

        AgreementProjection projection = request.collaborationId() == null
                ? AgreementProjection.disagreed(null, null)
                : AgreementProjection.disagreed(
                        request.collaborationId(),
                        request.baseAgreedRevision()
                );

        persistProjection(lockedDebt, projection, null, resolvedAt);
        recordProjectionSync(lockedDebt, projection);
        publishUpdated(request, "rejected", request.requesterUserId());

        return agreementMapper.toResponse(
                withStatus(request, "rejected", resolvedAt),
                targetUserId
        );
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public void cancel(UUID requesterUserId, UUID requestId) {
        AgreementRequest request = agreementRepository
                .findForRequesterUpdate(requestId, requesterUserId)
                .orElseThrow(this::notFound);

        if (request.isCancelled()) return;
        requirePending(request);

        Instant resolvedAt = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "cancelled", resolvedAt);

        Debt debt = debtRepository
                .findForUpdate(request.entityId(), requesterUserId)
                .orElse(null);

        if (debt != null) {
            AgreementProjection projection = request.collaborationId() == null
                    ? AgreementProjection.privateState()
                    : AgreementProjection.disagreed(
                            request.collaborationId(),
                            request.baseAgreedRevision()
                    );
            persistProjection(debt, projection, null, resolvedAt);
            recordProjectionSync(debt, projection);
        }

        publishUpdated(request, "cancelled", request.targetUserId());
    }

    @Transactional
    public void cancelPendingBetweenUsers(UUID firstUserId, UUID secondUserId) {
        Instant now = Instant.now(clock);

        for (AgreementRequest request :
                agreementRepository.findPendingBetweenUsersForUpdate(
                        firstUserId,
                        secondUserId
                )) {
            agreementRepository.updateStatus(request.id(), "cancelled", now);

            Debt debt = debtRepository
                    .findForUpdate(request.entityId(), request.requesterUserId())
                    .orElse(null);

            if (debt != null) {
                AgreementProjection projection = request.collaborationId() == null
                        ? AgreementProjection.privateState()
                        : AgreementProjection.disagreed(
                                request.collaborationId(),
                                request.baseAgreedRevision()
                        );
                persistProjection(debt, projection, null, now);
                recordProjectionSync(debt, projection);
            }

            publishUpdated(request, "cancelled", request.targetUserId());
        }
    }

    private void acceptInitialDebt(
            AgreementRequest request,
            Debt requesterDebt,
            Instant resolvedAt
    ) {
        if (!"create".equals(request.action())
                || collaborationRepository.findByDebtId(requesterDebt.getId()).isPresent()) {
            supersede(request);
            throw stale();
        }

        UUID targetMemberId = agreementRepository
                .findLinkedMemberId(request.targetUserId(), request.requesterUserId())
                .orElseThrow(this::relationshipEnded);

        Debt targetDebt = new Debt(
                UUID.randomUUID(),
                request.targetUserId(),
                targetMemberId,
                invertDirection(requesterDebt.getDirection()),
                requesterDebt.getAmount(),
                requesterDebt.getCurrency(),
                requesterDebt.getTitle(),
                requesterDebt.getDueDate(),
                resolvedAt,
                resolvedAt
        );
        debtRepository.saveAndFlush(targetDebt);

        UUID collaborationId = UUID.randomUUID();
        Parties parties = parties(
                request.requesterUserId(),
                request.targetUserId(),
                requesterDebt.getDirection()
        );

        DebtCollaboration collaboration = new DebtCollaboration(
                collaborationId,
                request.requesterUserId(),
                requesterDebt.getId(),
                request.targetUserId(),
                targetDebt.getId(),
                1L,
                false,
                parties.debtorUserId(),
                parties.creditorUserId(),
                requesterDebt.getAmount(),
                requesterDebt.getCurrency(),
                requesterDebt.getTitle(),
                requesterDebt.getDueDate(),
                request.id(),
                resolvedAt,
                resolvedAt
        );
        collaborationRepository.insert(collaboration);
        agreementRepository.attachCollaborationToRequest(
                request.id(),
                collaborationId
        );

        AgreementProjection projection = AgreementProjection.agreed(
                collaborationId,
                1L
        );
        persistProjection(requesterDebt, projection, request.id(), resolvedAt);
        persistProjection(targetDebt, projection, request.id(), resolvedAt);
        recordProjectionSync(requesterDebt, projection);
        recordProjectionSync(targetDebt, projection);
    }

    private void acceptExistingDebt(
            AgreementRequest request,
            Debt requesterDebt,
            Instant resolvedAt
    ) {
        DebtCollaboration collaboration = collaborationRepository
                .findByIdForUpdate(request.collaborationId())
                .orElseThrow(this::stale);

        if (request.baseAgreedRevision() == null
                || collaboration.agreedRevision() != request.baseAgreedRevision()
                || !collaboration.debtIdFor(request.requesterUserId()).equals(request.entityId())) {
            supersede(request);
            throw stale();
        }

        UUID targetDebtId = collaboration.debtIdFor(request.targetUserId());
        Debt targetDebt = debtRepository
                .findForUpdate(targetDebtId, request.targetUserId())
                .orElseThrow(this::relationshipEnded);

        Member targetMember = memberRepository
                .findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        targetDebt.getMemberId(),
                        request.targetUserId()
                )
                .orElseThrow(this::relationshipEnded);

        if (!request.requesterUserId().equals(targetMember.getLinkedUserId())) {
            cancelForEndedRelationship(request);
            throw relationshipEnded();
        }

        long nextRevision = collaboration.agreedRevision() + 1;
        boolean deleted = "delete".equals(request.action());

        if (deleted) {
            if (targetDebt.getDeletedAt() == null) {
                targetDebt.delete(resolvedAt);
                debtRepository.flush();
            }
        } else if ("update".equals(request.action())) {
            targetDebt.update(
                    targetDebt.getMemberId(),
                    invertDirection(requesterDebt.getDirection()),
                    requesterDebt.getAmount(),
                    requesterDebt.getCurrency(),
                    requesterDebt.getTitle(),
                    requesterDebt.getDueDate(),
                    resolvedAt
            );
            debtRepository.flush();
        } else {
            supersede(request);
            throw stale();
        }

        Parties parties = parties(
                request.requesterUserId(),
                request.targetUserId(),
                requesterDebt.getDirection()
        );
        collaborationRepository.updateAgreedSnapshot(
                collaboration.id(),
                nextRevision,
                deleted,
                parties.debtorUserId(),
                parties.creditorUserId(),
                requesterDebt.getAmount(),
                requesterDebt.getCurrency(),
                requesterDebt.getTitle(),
                requesterDebt.getDueDate(),
                request.id(),
                resolvedAt
        );

        AgreementProjection projection = AgreementProjection.agreed(
                collaboration.id(),
                nextRevision
        );
        persistProjection(requesterDebt, projection, request.id(), resolvedAt);
        persistProjection(targetDebt, projection, request.id(), resolvedAt);
        supersedeCompetingRequests(
                collaboration.id(),
                request.id(),
                projection,
                resolvedAt
        );

        if (!deleted) {
            recordProjectionSync(requesterDebt, projection);
            recordProjectionSync(targetDebt, projection);
        } else {
            recordDeleteSync(targetDebt);
        }
    }

    private Debt lockDebtForProposal(AgreementRequest request) {
        if (!DEBT.equals(request.entityType())) {
            throw new IllegalStateException(
                    "No agreement adapter exists for entity type: "
                            + request.entityType()
            );
        }

        return debtRepository
                .findForUpdate(request.entityId(), request.requesterUserId())
                .orElse(null);
    }

    private void validateLockedProposal(
            AgreementRequest request,
            Debt debt
    ) {
        if (debt == null
                || !debt.getVersion().equals(request.entityVersion())
                || ("delete".equals(request.action()) && debt.getDeletedAt() == null)
                || (!"delete".equals(request.action()) && debt.getDeletedAt() != null)) {
            supersede(request);
            throw stale();
        }

        Member member = memberRepository
                .findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        debt.getMemberId(),
                        request.requesterUserId()
                )
                .orElse(null);

        if (member == null
                || !request.targetUserId().equals(member.getLinkedUserId())) {
            cancelForEndedRelationship(request);
            throw relationshipEnded();
        }
    }

    private boolean matchesAgreedSnapshot(
            DebtCollaboration collaboration,
            Debt debt,
            UUID ownerUserId,
            UUID counterpartyUserId,
            boolean deleted
    ) {
        if (collaboration.agreedDeleted() != deleted) return false;
        if (deleted) return true;

        Parties parties = parties(ownerUserId, counterpartyUserId, debt.getDirection());
        return collaboration.agreedDebtorUserId().equals(parties.debtorUserId())
                && collaboration.agreedCreditorUserId().equals(parties.creditorUserId())
                && collaboration.agreedAmount().compareTo(debt.getAmount()) == 0
                && collaboration.agreedCurrency().equals(debt.getCurrency())
                && collaboration.agreedTitle().equals(debt.getTitle())
                && Objects.equals(collaboration.agreedDueDate(), debt.getDueDate());
    }

    private void supersedeCompetingRequests(
            UUID collaborationId,
            UUID acceptedRequestId,
            AgreementProjection projection,
            Instant resolvedAt
    ) {
        for (AgreementRequest stale : agreementRepository
                .supersedePendingForCollaboration(
                        collaborationId,
                        acceptedRequestId,
                        resolvedAt
                )) {
            Debt staleDebt = debtRepository
                    .findForUpdate(stale.entityId(), stale.requesterUserId())
                    .orElse(null);
            if (staleDebt != null) {
                persistProjection(staleDebt, projection, null, resolvedAt);
                recordProjectionSync(staleDebt, projection);
            }
            publishUpdated(stale, "superseded", stale.targetUserId());
        }
    }

    private void supersedePending(UUID ownerUserId, UUID debtId, Instant now) {
        for (AgreementRequest request : agreementRepository
                .supersedePendingForEntity(ownerUserId, DEBT, debtId, now)) {
            publishUpdated(request, "superseded", request.targetUserId());
        }
    }

    private void persistProjection(
            Debt debt,
            AgreementProjection projection,
            UUID latestRequestId,
            Instant updatedAt
    ) {
        agreementRepository.updateDebtProjection(
                debt.getOwnerUserId(),
                debt.getId(),
                projection.status(),
                projection.collaborationId(),
                projection.agreedRevision()
        );
        agreementRepository.upsertState(
                debt.getOwnerUserId(),
                DEBT,
                debt.getId(),
                debt.getVersion(),
                projection.status(),
                latestRequestId,
                projection.collaborationId(),
                projection.agreedRevision(),
                updatedAt
        );
    }

    private void recordProjectionSync(Debt debt, AgreementProjection projection) {
        if (debt.getDeletedAt() != null) return;

        syncChangeWriter.record(
                debt.getOwnerUserId(),
                List.of(new SyncChangeCommand(
                        SyncEntityType.DEBT,
                        debt.getId(),
                        SyncOperation.UPSERT,
                        debtMapper.toSyncPayload(debt, projection)
                ))
        );
    }

    private void recordDeleteSync(Debt debt) {
        syncChangeWriter.record(
                debt.getOwnerUserId(),
                List.of(new SyncChangeCommand(
                        SyncEntityType.DEBT,
                        debt.getId(),
                        SyncOperation.DELETE,
                        null
                ))
        );
    }

    private void publishCreated(AgreementRequest request) {
        realtimeEventPublisher.publish(
                request.targetUserId(),
                RealtimeEventTypes.INBOX_REQUEST_CREATED,
                requestEventPayload(request, "pending", request.requesterUserId())
        );
    }

    private void publishUpdated(
            AgreementRequest request,
            String status,
            UUID recipientUserId
    ) {
        UUID counterpartyUserId = recipientUserId.equals(request.requesterUserId())
                ? request.targetUserId()
                : request.requesterUserId();

        realtimeEventPublisher.publish(
                recipientUserId,
                RealtimeEventTypes.INBOX_REQUEST_UPDATED,
                requestEventPayload(request, status, counterpartyUserId)
        );
    }

    private Map<String, Object> requestEventPayload(
            AgreementRequest request,
            String status,
            UUID counterpartyUserId
    ) {
        return Map.of(
                "requestType", "debt",
                "requestId", request.id().toString(),
                "action", request.action(),
                "counterpartyName", agreementRepository.profileLabel(counterpartyUserId),
                "status", status
        );
    }

    private void supersede(AgreementRequest request) {
        Instant now = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "superseded", now);
        publishUpdated(request, "superseded", request.targetUserId());
    }

    private void cancelForEndedRelationship(AgreementRequest request) {
        Instant now = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "cancelled", now);
        publishUpdated(request, "cancelled", request.targetUserId());
    }

    private void requirePending(AgreementRequest request) {
        if (!request.isPending()) {
            throw new AgreementException(
                    AgreementException.Reason.REQUEST_NOT_PENDING,
                    "The agreement request is no longer pending."
            );
        }
    }

    private AgreementRequest withStatus(
            AgreementRequest request,
            String status,
            Instant resolvedAt
    ) {
        return new AgreementRequest(
                request.id(),
                request.requesterUserId(),
                request.targetUserId(),
                request.entityType(),
                request.entityId(),
                request.entityVersion(),
                request.collaborationId(),
                request.baseAgreedRevision(),
                request.action(),
                request.payload(),
                status,
                request.createdAt(),
                resolvedAt
        );
    }

    private Parties parties(UUID ownerUserId, UUID otherUserId, String direction) {
        if ("you_owe".equals(direction)) {
            return new Parties(ownerUserId, otherUserId);
        }
        return new Parties(otherUserId, ownerUserId);
    }

    private String invertDirection(String direction) {
        return "you_owe".equals(direction) ? "they_owe" : "you_owe";
    }

    private AgreementException notFound() {
        return new AgreementException(
                AgreementException.Reason.REQUEST_NOT_FOUND,
                "The agreement request does not exist."
        );
    }

    private AgreementException stale() {
        return new AgreementException(
                AgreementException.Reason.STALE_PROPOSAL,
                "The private or mutually agreed record changed after this proposal was created."
        );
    }

    private AgreementException relationshipEnded() {
        return new AgreementException(
                AgreementException.Reason.RELATIONSHIP_ENDED,
                "The linked-member relationship no longer exists."
        );
    }

    private record Parties(UUID debtorUserId, UUID creditorUserId) {}
}
