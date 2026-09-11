package com.debtulator.backend.sync;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class SyncPayloads {

    private SyncPayloads() {
    }

    public static void requireOnlyKeys(
            Map<String, Object> payload,
            Set<String> allowedKeys
    ) {
        for (String key : payload.keySet()) {
            if (!allowedKeys.contains(key)) {
                throw new IllegalArgumentException(
                        "Field '" + key + "' is not writable through sync."
                );
            }
        }
    }

    public static String requireString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (!(value instanceof String text)) {
            throw new IllegalArgumentException("Field '" + key + "' must be a string.");
        }
        return text;
    }

    public static UUID requireUuid(Map<String, Object> payload, String key) {
        String value = requireString(payload, key);
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Field '" + key + "' must be a UUID.");
        }
    }

    public static Instant requireInstant(Map<String, Object> payload, String key) {
        String value = requireString(payload, key);
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Field '" + key + "' must be an ISO-8601 instant.");
        }
    }

    public static LocalDate optionalLocalDate(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (!(value instanceof String text)) {
            throw new IllegalArgumentException("Field '" + key + "' must be a date or null.");
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Field '" + key + "' must use ISO date format.");
        }
    }

    public static BigDecimal requireDecimalString(Map<String, Object> payload, String key) {
        String value = requireString(payload, key);
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Field '" + key + "' must be a decimal string.");
        }
    }
}

