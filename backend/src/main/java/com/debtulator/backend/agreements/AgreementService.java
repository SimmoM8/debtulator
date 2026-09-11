package com.debtulator.backend.agreements;

import com.debtulator.backend.agreements.dto.AgreementRequestResponse;
import com.debtulator.backend.agreements.dto.AgreementStateResponse;
import com.debtulator.backend.debts.Debt;
import com.debtulator.backend.debts.DebtMapper;
import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.members.Member;
import com.debtulator.backend.members.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgreementService {
    private static final int MAX_REQUESTS = 100;
    private static final String DEBT = "debt";

    private final AgreementRepository agreementRepository;
    private final AgreementMapper agreementMapper;
    private final DebtRepository debtRepository;
    private final MemberRepository memberRepository;
    private final DebtMapper debtMapper;
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
     * The private debt has already been applied and flushed before this runs.
     * This method only changes collaboration metadata, never the private debt
     * row or its optimistic-lock version.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordDebtMutation(
            UUID ownerUserId,
            Member member,
            Debt debt,
            String action
    ) {
        Instant now = Instant.now(clock);

        agreementRepository.supersedePendingForEntity(
                ownerUserId,
                DEBT,
                debt.getId(),
                now
        );

        if (member.getLinkedUserId() == null) {
            agreementRepository.upsertState(
                    ownerUserId,
                    DEBT,
                    debt.getId(),
                    debt.getVersion(),
                    "private",
                    null,
                    now
            );
            return;
        }

        UUID requestId = UUID.randomUUID();

        agreementRepository.insert(new AgreementRequest(
                requestId,
                ownerUserId,
                member.getLinkedUserId(),
                DEBT,
                debt.getId(),
                debt.getVersion(),
                action,
                debtMapper.toAgreementPayload(debt),
                "pending",
                now,
                null
        ));

        agreementRepository.upsertState(
                ownerUserId,
                DEBT,
                debt.getId(),
                debt.getVersion(),
                "pending",
                requestId,
                now
        );
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordDeletedDebt(
            UUID ownerUserId,
            Member member,
            Debt debt
    ) {
        Instant now = Instant.now(clock);

        agreementRepository.supersedePendingForEntity(
                ownerUserId,
                DEBT,
                debt.getId(),
                now
        );

        if (member.getLinkedUserId() == null) {
            agreementRepository.upsertState(
                    ownerUserId,
                    DEBT,
                    debt.getId(),
                    debt.getVersion(),
                    "private",
                    null,
                    now
            );
            return;
        }

        UUID requestId = UUID.randomUUID();

        agreementRepository.insert(new AgreementRequest(
                requestId,
                ownerUserId,
                member.getLinkedUserId(),
                DEBT,
                debt.getId(),
                debt.getVersion(),
                "delete",
                debtMapper.toAgreementPayload(debt),
                "pending",
                now,
                null
        ));

        agreementRepository.upsertState(
                ownerUserId,
                DEBT,
                debt.getId(),
                debt.getVersion(),
                "pending",
                requestId,
                now
        );
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public AgreementRequestResponse accept(UUID targetUserId, UUID requestId) {
        AgreementRequest preview = agreementRepository
                .findForTarget(requestId, targetUserId)
                .orElseThrow(() -> notFound());

        if (preview.isAccepted()) {
            return agreementMapper.toResponse(preview, targetUserId);
        }
        requirePending(preview);

        Debt lockedDebt = lockDebtForProposal(preview);

        AgreementRequest request = agreementRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(() -> notFound());

        if (request.isAccepted()) {
            return agreementMapper.toResponse(request, targetUserId);
        }
        requirePending(request);
        validateLockedProposal(request, lockedDebt);

        Instant resolvedAt = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "accepted", resolvedAt);
        agreementRepository.updateStateIfLatest(
                request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.id(),
                "agreed",
                resolvedAt
        );

        return agreementMapper.toResponse(
                withStatus(request, "accepted", resolvedAt),
                targetUserId
        );
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public AgreementRequestResponse reject(UUID targetUserId, UUID requestId) {
        AgreementRequest preview = agreementRepository
                .findForTarget(requestId, targetUserId)
                .orElseThrow(() -> notFound());

        if (preview.isRejected()) {
            return agreementMapper.toResponse(preview, targetUserId);
        }
        requirePending(preview);

        Debt lockedDebt = lockDebtForProposal(preview);

        AgreementRequest request = agreementRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(() -> notFound());

        if (request.isRejected()) {
            return agreementMapper.toResponse(request, targetUserId);
        }
        requirePending(request);
        validateLockedProposal(request, lockedDebt);

        Instant resolvedAt = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "rejected", resolvedAt);
        agreementRepository.updateStateIfLatest(
                request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.id(),
                "rejected",
                resolvedAt
        );

        return agreementMapper.toResponse(
                withStatus(request, "rejected", resolvedAt),
                targetUserId
        );
    }

    @Transactional(noRollbackFor = AgreementException.class)
    public void cancel(UUID requesterUserId, UUID requestId) {
        AgreementRequest request = agreementRepository
                .findForRequesterUpdate(requestId, requesterUserId)
                .orElseThrow(() -> notFound());

        if (request.isCancelled()) return;

        requirePending(request);

        Instant resolvedAt = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "cancelled", resolvedAt);
        agreementRepository.clearStateIfLatest(
                request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.id(),
                request.entityVersion(),
                resolvedAt
        );
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
            agreementRepository.clearStateIfLatest(
                    request.requesterUserId(),
                    request.entityType(),
                    request.entityId(),
                    request.id(),
                    request.entityVersion(),
                    now
            );
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
                .findForUpdate(
                        request.entityId(),
                        request.requesterUserId()
                )
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

    private void supersede(AgreementRequest request) {
        Instant now = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "superseded", now);
        agreementRepository.clearStateIfLatest(
                request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.id(),
                request.entityVersion(),
                now
        );
    }

    private void cancelForEndedRelationship(AgreementRequest request) {
        Instant now = Instant.now(clock);
        agreementRepository.updateStatus(request.id(), "cancelled", now);
        agreementRepository.clearStateIfLatest(
                request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.id(),
                request.entityVersion(),
                now
        );
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
                request.action(),
                request.payload(),
                status,
                request.createdAt(),
                resolvedAt
        );
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
                "The private record changed after this proposal was created."
        );
    }

    private AgreementException relationshipEnded() {
        return new AgreementException(
                AgreementException.Reason.RELATIONSHIP_ENDED,
                "The linked-member relationship no longer exists."
        );
    }
}
