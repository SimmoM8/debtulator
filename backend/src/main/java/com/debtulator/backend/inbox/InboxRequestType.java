package com.debtulator.backend.inbox;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Locale;

@Getter
@RequiredArgsConstructor
public enum InboxRequestType {
    MEMBER_LINK("member_link"),
    DEBT("debt");

    private final String value;

    public static InboxRequestType fromValue(String value) {
        String normalized = value == null
                ? ""
                : value.trim().toLowerCase(Locale.ROOT);

        // Compatibility alias for clients released before debt requests were
        // generalized from debt_create to debt + action.
        if ("debt_create".equals(normalized)) {
            return DEBT;
        }

        return Arrays.stream(values())
                .filter(type -> type.value.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new InboxException(
                        InboxException.Reason.INVALID_TYPE,
                        "Unsupported inbox request type."
                ));
    }
}
