package com.debtulator.backend.debts;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class DebtMapper {

    public Map<String, Object> toSyncPayload(Debt debt) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", debt.getId().toString());
        payload.put("ownerUserId", debt.getOwnerUserId().toString());
        payload.put("memberId", debt.getMemberId().toString());
        payload.put("direction", debt.getDirection());
        payload.put("amount", formatAmount(debt.getAmount()));
        payload.put("currency", debt.getCurrency());
        payload.put("title", debt.getTitle());
        payload.put(
                "dueDate",
                debt.getDueDate() != null
                        ? debt.getDueDate().toString()
                        : null
        );
        payload.put("createdAt", debt.getCreatedAt().toString());
        payload.put("updatedAt", debt.getUpdatedAt().toString());
        payload.put("version", debt.getVersion());
        return payload;
    }

    public Map<String, Object> toAgreementPayload(Debt debt) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("memberId", debt.getMemberId().toString());
        payload.put("direction", debt.getDirection());
        payload.put("amount", formatAmount(debt.getAmount()));
        payload.put("currency", debt.getCurrency());
        payload.put("title", debt.getTitle());
        payload.put(
                "dueDate",
                debt.getDueDate() != null
                        ? debt.getDueDate().toString()
                        : null
        );
        return payload;
    }

    private String formatAmount(BigDecimal amount) {
        return amount.stripTrailingZeros().toPlainString();
    }
}
