package com.debtulator.backend.inbox;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Locale;

@Getter
@RequiredArgsConstructor
public enum InboxRequestScope {
    NEEDS_ACTION("needs_action"),
    SENT("sent"),
    HISTORY("history");

    private final String value;

    public static InboxRequestScope fromValue(String value) {
        String normalized = value == null
                ? ""
                : value.trim().toLowerCase(Locale.ROOT);

        return Arrays.stream(values())
                .filter(scope -> scope.value.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new InboxException(
                        InboxException.Reason.INVALID_SCOPE,
                        "Unsupported inbox scope."
                ));
    }
}
