package com.debtulator.backend.sync;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SyncMutationStatus {
    APPLIED("applied"),
    CONFLICT("conflict"),
    REJECTED("rejected"),
    RETRY("retry");

    private final String value;
}
