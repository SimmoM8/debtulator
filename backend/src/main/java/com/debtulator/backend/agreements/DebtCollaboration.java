package com.debtulator.backend.agreements;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DebtCollaboration(
        UUID id,
        UUID firstUserId,
        UUID firstDebtId,
        UUID secondUserId,
        UUID secondDebtId,
        long agreedRevision,
        boolean agreedDeleted,
        UUID agreedDebtorUserId,
        UUID agreedCreditorUserId,
        BigDecimal agreedAmount,
        String agreedCurrency,
        String agreedTitle,
        LocalDate agreedDueDate,
        UUID lastAgreedRequestId,
        Instant createdAt,
        Instant updatedAt
) {
    public UUID otherUserId(UUID userId) {
        if (firstUserId.equals(userId)) return secondUserId;
        if (secondUserId.equals(userId)) return firstUserId;
        throw new IllegalArgumentException("User is not part of this debt collaboration.");
    }

    public UUID debtIdFor(UUID userId) {
        if (firstUserId.equals(userId)) return firstDebtId;
        if (secondUserId.equals(userId)) return secondDebtId;
        throw new IllegalArgumentException("User is not part of this debt collaboration.");
    }
}
