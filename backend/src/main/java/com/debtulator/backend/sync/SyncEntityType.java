package com.debtulator.backend.sync;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Optional;

@Getter
@RequiredArgsConstructor
public enum SyncEntityType {
    MEMBER("member"),
    DEBT("debt");

    private final String value;

    public static Optional<SyncEntityType> fromValue(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equals(value))
                .findFirst();
    }
}
