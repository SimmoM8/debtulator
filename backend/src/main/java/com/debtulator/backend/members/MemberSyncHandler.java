package com.debtulator.backend.members;

import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.sync.SyncBootstrapBatch;
import com.debtulator.backend.sync.SyncChangeCommand;
import com.debtulator.backend.sync.SyncEntityHandler;
import com.debtulator.backend.sync.SyncEntityType;
import com.debtulator.backend.sync.SyncErrorCode;
import com.debtulator.backend.sync.SyncHandlerResult;
import com.debtulator.backend.sync.SyncMutationCommand;
import com.debtulator.backend.sync.SyncOperation;
import com.debtulator.backend.sync.SyncPayloads;
import com.debtulator.backend.sync.dto.SyncBootstrapItem;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MemberSyncHandler implements SyncEntityHandler {

    private static final Set<String> CREATE_FIELDS = Set.of(
            "displayName",
            "createdAt"
    );

    private static final Set<String> UPDATE_FIELDS = Set.of(
            "displayName"
    );

    private final MemberRepository memberRepository;
    private final DebtRepository debtRepository;
    private final MemberMapper memberMapper;
    private final Clock clock;

    @Override
    public SyncEntityType entityType() {
        return SyncEntityType.MEMBER;
    }

    @Override
    public SyncHandlerResult applyMutation(
            UUID ownerUserId,
            SyncMutationCommand mutation
    ) {
        return switch (mutation.operation()) {
            case UPSERT -> upsert(ownerUserId, mutation);
            case DELETE -> delete(ownerUserId, mutation);
        };
    }

    @Override
    public SyncBootstrapBatch bootstrap(
            UUID ownerUserId,
            UUID afterId,
            int limit
    ) {
        var pageable = PageRequest.of(0, limit + 1);

        List<Member> rows = afterId == null
                ? memberRepository.findByOwnerUserIdAndDeletedAtIsNullOrderByIdAsc(
                ownerUserId,
                pageable
        )
                : memberRepository.findByOwnerUserIdAndDeletedAtIsNullAndIdGreaterThanOrderByIdAsc(
                ownerUserId,
                afterId,
                pageable
        );

        boolean hasMore = rows.size() > limit;
        List<Member> page = hasMore
                ? rows.subList(0, limit)
                : rows;

        List<SyncBootstrapItem> items = page.stream()
                .map(member -> new SyncBootstrapItem(
                        member.getId(),
                        member.getVersion(),
                        memberMapper.toSyncPayload(member)
                ))
                .toList();

        UUID nextAfterId = items.isEmpty()
                ? null
                : items.getLast().entityId();

        return new SyncBootstrapBatch(
                items,
                nextAfterId,
                hasMore
        );
    }

    private SyncHandlerResult upsert(
            UUID ownerUserId,
            SyncMutationCommand mutation
    ) {
        try {
            Map<String, Object> payload = mutation.payload();

            SyncPayloads.requireOnlyKeys(
                    payload,
                    mutation.baseVersion() == null
                            ? CREATE_FIELDS
                            : UPDATE_FIELDS
            );

            String displayName = SyncPayloads
                    .requireString(payload, "displayName")
                    .trim();

            if (displayName.isEmpty()
                    || displayName.codePointCount(0, displayName.length()) > 120) {
                return SyncHandlerResult.rejected(
                        SyncErrorCode.INVALID_PAYLOAD,
                        "displayName must contain between 1 and 120 characters."
                );
            }

            Instant now = Instant.now(clock);

            if (mutation.baseVersion() == null) {
                if (memberRepository.existsById(mutation.entityId())) {
                    return SyncHandlerResult.conflict(
                            null,
                            SyncErrorCode.ENTITY_ALREADY_EXISTS,
                            "The member already exists."
                    );
                }

                Instant createdAt = SyncPayloads.requireInstant(
                        payload,
                        "createdAt"
                );

                Member member = new Member(
                        mutation.entityId(),
                        ownerUserId,
                        displayName,
                        createdAt,
                        now
                );

                memberRepository.saveAndFlush(member);

                return SyncHandlerResult.applied(
                        member.getVersion(),
                        List.of(upsertChange(member))
                );
            }

            Member member = memberRepository
                    .findForUpdate(mutation.entityId(), ownerUserId)
                    .orElse(null);

            if (member == null) {
                return SyncHandlerResult.conflict(
                        null,
                        SyncErrorCode.ENTITY_NOT_FOUND,
                        "The member no longer exists."
                );
            }

            if (member.getDeletedAt() != null) {
                return SyncHandlerResult.conflict(
                        member.getVersion(),
                        SyncErrorCode.ENTITY_DELETED,
                        "The member has been deleted."
                );
            }

            if (!member.getVersion().equals(mutation.baseVersion())) {
                return SyncHandlerResult.conflict(
                        member.getVersion(),
                        SyncErrorCode.VERSION_CONFLICT,
                        "The member has changed since this device last synchronized."
                );
            }

            member.rename(displayName, now);
            memberRepository.flush();

            return SyncHandlerResult.applied(
                    member.getVersion(),
                    List.of(upsertChange(member))
            );
        } catch (IllegalArgumentException exception) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    exception.getMessage()
            );
        }
    }

    private SyncHandlerResult delete(
            UUID ownerUserId,
            SyncMutationCommand mutation
    ) {
        if (mutation.baseVersion() == null) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.BASE_VERSION_REQUIRED,
                    "Deleting an existing member requires baseVersion."
            );
        }

        Member member = memberRepository
                .findForUpdate(mutation.entityId(), ownerUserId)
                .orElse(null);

        if (member == null) {
            return SyncHandlerResult.applied(
                    null,
                    List.of()
            );
        }

        if (member.getDeletedAt() != null) {
            return SyncHandlerResult.applied(
                    member.getVersion(),
                    List.of()
            );
        }

        if (!member.getVersion().equals(mutation.baseVersion())) {
            return SyncHandlerResult.conflict(
                    member.getVersion(),
                    SyncErrorCode.VERSION_CONFLICT,
                    "The member has changed since this device last synchronized."
            );
        }

        if (member.getLinkedUserId() != null) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_LINKED,
                    "A linked member cannot be removed through personal ledger sync."
            );
        }

        if (debtRepository.existsByOwnerUserIdAndMemberIdAndDeletedAtIsNull(
                ownerUserId,
                member.getId()
        )) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_IN_USE,
                    "The member has active debts and cannot be removed."
            );
        }

        Instant now = Instant.now(clock);

        member.delete(now);
        memberRepository.flush();

        return SyncHandlerResult.applied(
                member.getVersion(),
                List.of(new SyncChangeCommand(
                        SyncEntityType.MEMBER,
                        member.getId(),
                        SyncOperation.DELETE,
                        null
                ))
        );
    }

    private SyncChangeCommand upsertChange(Member member) {
        return new SyncChangeCommand(
                SyncEntityType.MEMBER,
                member.getId(),
                SyncOperation.UPSERT,
                memberMapper.toSyncPayload(member)
        );
    }
}
