package com.debtulator.backend.exceptions;

import lombok.Getter;

@Getter
public class SyncCursorExpiredException extends RuntimeException {

    private final long minimumCursor;

    public SyncCursorExpiredException(long minimumCursor) {
        super("Sync cursor expired.");
        this.minimumCursor = minimumCursor;
    }
}

