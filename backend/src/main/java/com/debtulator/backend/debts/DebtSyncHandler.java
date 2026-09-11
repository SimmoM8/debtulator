package com.debtulator.backend.debts;

import com.debtulator.backend.sync.SyncBootstrapBatch;
import com.debtulator.backend.sync.SyncEntityHandler;
import com.debtulator.backend.sync.SyncEntityType;
import com.debtulator.backend.sync.SyncErrorCode;
import com.debtulator.backend.sync.SyncHandlerResult;
import com.debtulator.backend.sync.SyncMutationCommand;
import com.debtulator.backend.sync.SyncPayloads;
import com.debtulator.backend.sync.dto.SyncBootstrapItem;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DebtSyncHandler implements SyncEntityHandler {

    private static final Set<String> CREATE_FIELDS = Set.of(
            "memberId",
            "direction",
            "amount",
            "currency",
            "title",
            "dueDate",
            "createdAt"
    );

    private static final Set<String> UPDATE_FIELDS = Set.of(
            "memberId",
            "direction",
            "amount",
            "currency",
            "title",
            "dueDate"
    );

    private final DebtService debtService;
    private final DebtRepository debtRepository;
    private final DebtMapper debtMapper;

    @Override
    public SyncEntityType entityType() {
        return SyncEntityType.DEBT;
    }

    @Override
    public SyncHandlerResult applyMutation(
            UUID ownerUserId,
            SyncMutationCommand mutation
    ) {
        try {
            return switch (mutation.operation()) {
                case UPSERT -> upsert(ownerUserId, mutation);
                case DELETE -> delete(ownerUserId, mutation);
            };
        } catch (DebtServiceException exception) {
            return mapException(exception);
        }
    }

    @Override
    public SyncBootstrapBatch bootstrap(
            UUID ownerUserId,
            UUID afterId,
            int limit
    ) {
        var pageable = PageRequest.of(0, limit + 1);

        List<Debt> rows = afterId == null
                ? debtRepository.findByOwnerUserIdAndDeletedAtIsNullOrderByIdAsc(
                        ownerUserId,
                        pageable
                )
                : debtRepository.findByOwnerUserIdAndDeletedAtIsNullAndIdGreaterThanOrderByIdAsc(
                        ownerUserId,
                        afterId,
                        pageable
                );

        boolean hasMore = rows.size() > limit;
        List<Debt> page = hasMore
                ? rows.subList(0, limit)
                : rows;

        List<SyncBootstrapItem> items = page.stream()
                .map(debt -> new SyncBootstrapItem(
                        debt.getId(),
                        debt.getVersion(),
                        debtMapper.toSyncPayload(debt)
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
        Map<String, Object> payload = mutation.payload();

        try {
            SyncPayloads.requireOnlyKeys(
                    payload,
                    mutation.baseVersion() == null
                            ? CREATE_FIELDS
                            : UPDATE_FIELDS
            );

            UUID memberId = SyncPayloads.requireUuid(payload, "memberId");
            String direction = SyncPayloads.requireString(payload, "direction");
            BigDecimal amount = SyncPayloads.requireDecimalString(payload, "amount");
            String currency = SyncPayloads.requireString(payload, "currency");
            String title = SyncPayloads.requireString(payload, "title");
            LocalDate dueDate = SyncPayloads.optionalLocalDate(payload, "dueDate");

            if (mutation.baseVersion() == null) {
                Instant createdAt = SyncPayloads.requireInstant(
                        payload,
                        "createdAt"
                );

                Debt debt = debtService.create(
                        ownerUserId,
                        mutation.entityId(),
                        memberId,
                        direction,
                        amount,
                        currency,
                        title,
                        dueDate,
                        createdAt
                );

                return SyncHandlerResult.applied(debt.getVersion());
            }

            Debt debt = debtService.update(
                    ownerUserId,
                    mutation.entityId(),
                    mutation.baseVersion(),
                    memberId,
                    direction,
                    amount,
                    currency,
                    title,
                    dueDate
            );

            return SyncHandlerResult.applied(debt.getVersion());
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
                    "Deleting an existing debt requires baseVersion."
            );
        }

        Long version = debtService.delete(
                ownerUserId,
                mutation.entityId(),
                mutation.baseVersion()
        );

        return SyncHandlerResult.applied(version);
    }

    private SyncHandlerResult mapException(DebtServiceException exception) {
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
            case MEMBER_NOT_FOUND -> SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_NOT_FOUND,
                    exception.getMessage()
            );
            case CURRENCY_NOT_SUPPORTED -> SyncHandlerResult.rejected(
                    SyncErrorCode.CURRENCY_NOT_SUPPORTED,
                    exception.getMessage()
            );
            case INVALID_DIRECTION, INVALID_AMOUNT, INVALID_TITLE ->
                    SyncHandlerResult.rejected(
                            SyncErrorCode.INVALID_PAYLOAD,
                            exception.getMessage()
                    );
        };
    }
}
