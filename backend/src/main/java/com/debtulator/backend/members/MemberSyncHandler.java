package com.debtulator.backend.members;

import com.debtulator.backend.sync.*;
import com.debtulator.backend.sync.dto.SyncBootstrapItem;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MemberSyncHandler implements SyncEntityHandler {
    private static final Set<String> CREATE_FIELDS = Set.of("displayName", "createdAt");
    private static final Set<String> UPDATE_FIELDS = Set.of("displayName");

    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final MemberMapper memberMapper;

    @Override
    public SyncEntityType entityType() { return SyncEntityType.MEMBER; }

    @Override
    public SyncHandlerResult applyMutation(UUID ownerUserId, SyncMutationCommand mutation) {
        try {
            return switch (mutation.operation()) {
                case UPSERT -> upsert(ownerUserId, mutation);
                case DELETE -> delete(ownerUserId, mutation);
            };
        } catch (MemberServiceException exception) {
            return mapException(exception);
        }
    }

    @Override
    public SyncBootstrapBatch bootstrap(UUID ownerUserId, UUID afterId, int limit) {
        var pageable = PageRequest.of(0, limit + 1);
        List<Member> rows = afterId == null
                ? memberRepository.findByOwnerUserIdAndDeletedAtIsNullOrderByIdAsc(ownerUserId, pageable)
                : memberRepository.findByOwnerUserIdAndDeletedAtIsNullAndIdGreaterThanOrderByIdAsc(
                        ownerUserId, afterId, pageable
                );

        boolean hasMore = rows.size() > limit;
        List<Member> page = hasMore ? rows.subList(0, limit) : rows;
        List<SyncBootstrapItem> items = page.stream()
                .map(member -> new SyncBootstrapItem(
                        member.getId(),
                        member.getVersion(),
                        memberMapper.toSyncPayload(member)
                ))
                .toList();
        UUID nextAfterId = items.isEmpty() ? null : items.getLast().entityId();
        return new SyncBootstrapBatch(items, nextAfterId, hasMore);
    }

    private SyncHandlerResult upsert(UUID ownerUserId, SyncMutationCommand mutation) {
        Map<String, Object> payload = mutation.payload();
        try {
            SyncPayloads.requireOnlyKeys(
                    payload,
                    mutation.baseVersion() == null ? CREATE_FIELDS : UPDATE_FIELDS
            );
            String displayName = SyncPayloads.requireString(payload, "displayName");
            if (mutation.baseVersion() == null) {
                Instant createdAt = SyncPayloads.requireInstant(payload, "createdAt");
                Member member = memberService.create(
                        ownerUserId,
                        mutation.entityId(),
                        displayName,
                        createdAt
                );
                return SyncHandlerResult.applied(member.getVersion());
            }

            Member member = memberService.rename(
                    ownerUserId,
                    mutation.entityId(),
                    mutation.baseVersion(),
                    displayName
            );
            return SyncHandlerResult.applied(member.getVersion());
        } catch (IllegalArgumentException exception) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    exception.getMessage()
            );
        }
    }

    private SyncHandlerResult delete(UUID ownerUserId, SyncMutationCommand mutation) {
        if (mutation.baseVersion() == null) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.BASE_VERSION_REQUIRED,
                    "Deleting an existing member requires baseVersion."
            );
        }
        Long version = memberService.delete(
                ownerUserId,
                mutation.entityId(),
                mutation.baseVersion()
        );
        return SyncHandlerResult.applied(version);
    }

    private SyncHandlerResult mapException(MemberServiceException exception) {
        return switch (exception.getReason()) {
            case ALREADY_EXISTS -> SyncHandlerResult.conflict(
                    exception.getCurrentVersion(),
                    SyncErrorCode.ENTITY_ALREADY_EXISTS,
                    exception.getMessage()
            );
            case NOT_FOUND -> SyncHandlerResult.conflict(
                    exception.getCurrentVersion(),
                    SyncErrorCode.ENTITY_NOT_FOUND,
                    exception.getMessage()
            );
            case DELETED -> SyncHandlerResult.conflict(
                    exception.getCurrentVersion(),
                    SyncErrorCode.ENTITY_DELETED,
                    exception.getMessage()
            );
            case VERSION_CONFLICT -> SyncHandlerResult.conflict(
                    exception.getCurrentVersion(),
                    SyncErrorCode.VERSION_CONFLICT,
                    exception.getMessage()
            );
            case INVALID_DISPLAY_NAME -> SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    exception.getMessage()
            );
            case LINKED -> SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_LINKED,
                    exception.getMessage()
            );
            case LINK_PENDING -> SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_LINK_PENDING,
                    exception.getMessage()
            );
            case IN_USE -> SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_IN_USE,
                    exception.getMessage()
            );
        };
    }
}
