package com.debtulator.backend.sync;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Optional;

@Getter
@RequiredArgsConstructor
public enum SyncOperation {
    UPSERT("upsert"),
    DELETE("delete");

    private final String value;

    public static Optional<SyncOperation> fromValue(String value) {
        return Arrays.stream(values())
                .filter(operation -> operation.value.equals(value))
                .findFirst();
    }
}
