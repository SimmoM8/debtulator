package com.debtulator.backend.sync;

public record SyncHandlerResult(
        SyncMutationStatus status,
        Long version,
        SyncErrorCode errorCode,
        String message
) {

    public static SyncHandlerResult applied(Long version) {
        return new SyncHandlerResult(
                SyncMutationStatus.APPLIED,
                version,
                null,
                null
        );
    }

    public static SyncHandlerResult conflict(
            Long serverVersion,
            SyncErrorCode errorCode,
            String message
    ) {
        return new SyncHandlerResult(
                SyncMutationStatus.CONFLICT,
                serverVersion,
                errorCode,
                message
        );
    }

    public static SyncHandlerResult rejected(
            SyncErrorCode errorCode,
            String message
    ) {
        return new SyncHandlerResult(
                SyncMutationStatus.REJECTED,
                null,
                errorCode,
                message
        );
    }
}
