package com.debtulator.backend.debts;

import com.debtulator.backend.currencies.CurrencyRepository;
import com.debtulator.backend.members.MemberRepository;
import com.debtulator.backend.sync.SyncChangeCommand;
import com.debtulator.backend.sync.SyncChangeWriter;
import com.debtulator.backend.sync.SyncEntityType;
import com.debtulator.backend.sync.SyncOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(noRollbackFor = DebtServiceException.class)
public class DebtService {

    private static final Set<String> DIRECTIONS = Set.of(
            "you_owe",
            "they_owe"
    );

    private final DebtRepository debtRepository;
    private final MemberRepository memberRepository;
    private final CurrencyRepository currencyRepository;
    private final DebtMapper debtMapper;
    private final SyncChangeWriter syncChangeWriter;
    private final Clock clock;

    public Debt create(
            UUID ownerUserId,
            UUID debtId,
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title,
            LocalDate dueDate,
            Instant createdAt
    ) {
        String normalizedCurrency = validateAndNormalize(
                ownerUserId,
                memberId,
                direction,
                amount,
                currency,
                title
        );

        if (debtRepository.existsById(debtId)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.ALREADY_EXISTS,
                    null,
                    "The debt already exists."
            );
        }

        Instant now = Instant.now(clock);
        Debt debt = new Debt(
                debtId,
                ownerUserId,
                memberId,
                direction,
                amount,
                normalizedCurrency,
                title,
                dueDate,
                createdAt,
                now
        );

        debtRepository.saveAndFlush(debt);
        recordUpsert(ownerUserId, debt);

        return debt;
    }

    public Debt update(
            UUID ownerUserId,
            UUID debtId,
            long expectedVersion,
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title,
            LocalDate dueDate
    ) {
        String normalizedCurrency = validateAndNormalize(
                ownerUserId,
                memberId,
                direction,
                amount,
                currency,
                title
        );

        Debt debt = requireExisting(ownerUserId, debtId);

        if (!debt.getVersion().equals(expectedVersion)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.VERSION_CONFLICT,
                    debt.getVersion(),
                    "The debt has changed since this device last synchronized."
            );
        }

        debt.update(
                memberId,
                direction,
                amount,
                normalizedCurrency,
                title,
                dueDate,
                Instant.now(clock)
        );

        debtRepository.flush();
        recordUpsert(ownerUserId, debt);

        return debt;
    }

    public Long delete(
            UUID ownerUserId,
            UUID debtId,
            long expectedVersion
    ) {
        Debt debt = debtRepository
                .findForUpdate(debtId, ownerUserId)
                .orElse(null);

        if (debt == null) {
            return null;
        }

        if (debt.getDeletedAt() != null) {
            return debt.getVersion();
        }

        if (!debt.getVersion().equals(expectedVersion)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.VERSION_CONFLICT,
                    debt.getVersion(),
                    "The debt has changed since this device last synchronized."
            );
        }

        Instant now = Instant.now(clock);
        debt.delete(now);
        debtRepository.flush();

        syncChangeWriter.record(
                ownerUserId,
                List.of(new SyncChangeCommand(
                        SyncEntityType.DEBT,
                        debt.getId(),
                        SyncOperation.DELETE,
                        null
                ))
        );

        return debt.getVersion();
    }

    private Debt requireExisting(UUID ownerUserId, UUID debtId) {
        Debt debt = debtRepository
                .findForUpdate(debtId, ownerUserId)
                .orElseThrow(() -> new DebtServiceException(
                        DebtServiceException.Reason.NOT_FOUND,
                        null,
                        "The debt no longer exists."
                ));

        if (debt.getDeletedAt() != null) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.DELETED,
                    debt.getVersion(),
                    "The debt has been deleted."
            );
        }

        return debt;
    }

    private String validateAndNormalize(
            UUID ownerUserId,
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title
    ) {
        if (!DIRECTIONS.contains(direction)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.INVALID_DIRECTION,
                    null,
                    "direction must be 'you_owe' or 'they_owe'."
            );
        }

        if (!isValidAmount(amount)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.INVALID_AMOUNT,
                    null,
                    "amount must be positive, have at most 17 integer digits, and at most 2 decimal places."
            );
        }

        if (title == null || title.codePointCount(0, title.length()) > 120) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.INVALID_TITLE,
                    null,
                    "title must not exceed 120 characters."
            );
        }

        if (memberRepository
                .findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        memberId,
                        ownerUserId
                )
                .isEmpty()) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.MEMBER_NOT_FOUND,
                    null,
                    "The selected member does not exist."
            );
        }

        String normalizedCurrency = currency == null
                ? ""
                : currency.trim().toUpperCase(Locale.ROOT);

        if (!currencyRepository.existsById(normalizedCurrency)) {
            throw new DebtServiceException(
                    DebtServiceException.Reason.CURRENCY_NOT_SUPPORTED,
                    null,
                    "The selected currency is not supported."
            );
        }

        return normalizedCurrency;
    }

    private boolean isValidAmount(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return false;
        }

        BigDecimal normalized = amount.stripTrailingZeros();
        int scale = Math.max(normalized.scale(), 0);
        int integerDigits = Math.max(
                normalized.precision() - normalized.scale(),
                0
        );

        return scale <= 2 && integerDigits <= 17;
    }

    private void recordUpsert(UUID ownerUserId, Debt debt) {
        syncChangeWriter.record(
                ownerUserId,
                List.of(new SyncChangeCommand(
                        SyncEntityType.DEBT,
                        debt.getId(),
                        SyncOperation.UPSERT,
                        debtMapper.toSyncPayload(debt)
                ))
        );
    }
}
