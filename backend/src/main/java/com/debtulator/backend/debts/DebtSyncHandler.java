package com.debtulator.backend.debts;

import com.debtulator.backend.currencies.CurrencyRepository;
import com.debtulator.backend.members.MemberRepository;
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

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
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

    private static final Set<String> DIRECTIONS = Set.of(
            "you_owe",
            "they_owe"
    );

    private final DebtRepository debtRepository;
    private final MemberRepository memberRepository;
    private final CurrencyRepository currencyRepository;
    private final DebtMapper debtMapper;
    private final Clock clock;

    @Override
    public SyncEntityType entityType() {
        return SyncEntityType.DEBT;
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
        try {
            Map<String, Object> payload = mutation.payload();

            SyncPayloads.requireOnlyKeys(
                    payload,
                    mutation.baseVersion() == null
                            ? CREATE_FIELDS
                            : UPDATE_FIELDS
            );

            UUID memberId = SyncPayloads.requireUuid(
                    payload,
                    "memberId"
            );

            String direction = SyncPayloads.requireString(
                    payload,
                    "direction"
            );

            BigDecimal amount = SyncPayloads.requireDecimalString(
                    payload,
                    "amount"
            );

            String currency = SyncPayloads
                    .requireString(payload, "currency")
                    .toUpperCase(Locale.ROOT);

            String title = SyncPayloads.requireString(
                    payload,
                    "title"
            );

            LocalDate dueDate = SyncPayloads.optionalLocalDate(
                    payload,
                    "dueDate"
            );

            SyncHandlerResult validation = validateValues(
                    ownerUserId,
                    memberId,
                    direction,
                    amount,
                    currency,
                    title
            );

            if (validation != null) {
                return validation;
            }

            Instant now = Instant.now(clock);

            if (mutation.baseVersion() == null) {
                if (debtRepository.existsById(mutation.entityId())) {
                    return SyncHandlerResult.conflict(
                            null,
                            SyncErrorCode.ENTITY_ALREADY_EXISTS,
                            "The debt already exists."
                    );
                }

                Instant createdAt = SyncPayloads.requireInstant(
                        payload,
                        "createdAt"
                );

                Debt debt = new Debt(
                        mutation.entityId(),
                        ownerUserId,
                        memberId,
                        direction,
                        amount,
                        currency,
                        title,
                        dueDate,
                        createdAt,
                        now
                );

                debtRepository.saveAndFlush(debt);

                return SyncHandlerResult.applied(
                        debt.getVersion(),
                        List.of(upsertChange(debt))
                );
            }

            Debt debt = debtRepository
                    .findForUpdate(mutation.entityId(), ownerUserId)
                    .orElse(null);

            if (debt == null) {
                return SyncHandlerResult.conflict(
                        null,
                        SyncErrorCode.ENTITY_NOT_FOUND,
                        "The debt no longer exists."
                );
            }

            if (debt.getDeletedAt() != null) {
                return SyncHandlerResult.conflict(
                        debt.getVersion(),
                        SyncErrorCode.ENTITY_DELETED,
                        "The debt has been deleted."
                );
            }

            if (!debt.getVersion().equals(mutation.baseVersion())) {
                return SyncHandlerResult.conflict(
                        debt.getVersion(),
                        SyncErrorCode.VERSION_CONFLICT,
                        "The debt has changed since this device last synchronized."
                );
            }

            debt.update(
                    memberId,
                    direction,
                    amount,
                    currency,
                    title,
                    dueDate,
                    now
            );

            debtRepository.flush();

            return SyncHandlerResult.applied(
                    debt.getVersion(),
                    List.of(upsertChange(debt))
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
                    "Deleting an existing debt requires baseVersion."
            );
        }

        Debt debt = debtRepository
                .findForUpdate(mutation.entityId(), ownerUserId)
                .orElse(null);

        if (debt == null) {
            return SyncHandlerResult.applied(
                    null,
                    List.of()
            );
        }

        if (debt.getDeletedAt() != null) {
            return SyncHandlerResult.applied(
                    debt.getVersion(),
                    List.of()
            );
        }

        if (!debt.getVersion().equals(mutation.baseVersion())) {
            return SyncHandlerResult.conflict(
                    debt.getVersion(),
                    SyncErrorCode.VERSION_CONFLICT,
                    "The debt has changed since this device last synchronized."
            );
        }

        Instant now = Instant.now(clock);

        debt.delete(now);
        debtRepository.flush();

        return SyncHandlerResult.applied(
                debt.getVersion(),
                List.of(new SyncChangeCommand(
                        SyncEntityType.DEBT,
                        debt.getId(),
                        SyncOperation.DELETE,
                        null
                ))
        );
    }

    private SyncHandlerResult validateValues(
            UUID ownerUserId,
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title
    ) {
        if (!DIRECTIONS.contains(direction)) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "direction must be 'you_owe' or 'they_owe'."
            );
        }

        if (amount.signum() <= 0
                || amount.precision() > 19
                || Math.max(0, amount.stripTrailingZeros().scale()) > 2) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "amount must be positive with at most 19 digits and 2 decimal places."
            );
        }

        if (title.codePointCount(0, title.length()) > 120) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "title must not exceed 120 characters."
            );
        }

        if (memberRepository
                .findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        memberId,
                        ownerUserId
                )
                .isEmpty()) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.MEMBER_NOT_FOUND,
                    "The selected member does not exist."
            );
        }

        if (!currencyRepository.existsById(currency)) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.CURRENCY_NOT_SUPPORTED,
                    "The selected currency is not supported."
            );
        }

        return null;
    }

    private SyncChangeCommand upsertChange(Debt debt) {
        return new SyncChangeCommand(
                SyncEntityType.DEBT,
                debt.getId(),
                SyncOperation.UPSERT,
                debtMapper.toSyncPayload(debt)
        );
    }
}

