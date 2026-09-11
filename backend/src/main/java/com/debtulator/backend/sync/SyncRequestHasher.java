package com.debtulator.backend.sync;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class SyncRequestHasher {

    public String hash(UUID ownerUserId, SyncMutationCommand command) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, ownerUserId.toString());
        append(canonical, command.id().toString());
        append(canonical, command.entityType().getValue());
        append(canonical, command.entityId().toString());
        append(canonical, command.operation().getValue());
        append(canonical, command.baseVersion());
        append(canonical, command.payload());

        try {
            byte[] digest = MessageDigest
                    .getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8));

            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private void append(StringBuilder target, Object value) {
        if (value == null) {
            target.append("N;");
            return;
        }

        if (value instanceof Map<?, ?> map) {
            target.append("M{");
            List<Map.Entry<?, ?>> entries = new ArrayList<>(map.entrySet());
            entries.sort(Comparator.comparing(entry -> String.valueOf(entry.getKey())));
            for (Map.Entry<?, ?> entry : entries) {
                append(target, String.valueOf(entry.getKey()));
                append(target, entry.getValue());
            }
            target.append("};");
            return;
        }

        if (value instanceof List<?> list) {
            target.append("L[");
            for (Object item : list) {
                append(target, item);
            }
            target.append("]; ");
            return;
        }

        if (value instanceof Number number) {
            BigDecimal normalized = new BigDecimal(number.toString()).stripTrailingZeros();
            target.append("D:").append(normalized.toPlainString()).append(';');
            return;
        }

        if (value instanceof Boolean bool) {
            target.append(bool ? "B:1;" : "B:0;");
            return;
        }

        String text = String.valueOf(value);
        target.append("S:")
                .append(text.length())
                .append(':')
                .append(text)
                .append(';');
    }
}

