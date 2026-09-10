package com.debtulator.backend.sync;

import java.util.List;

public record SyncHandlerResult(
        SyncMutationStatus status,
        Long version,
        SyncErrorCode errorCode,
        String message,
        List<SyncChangeCommand> changes
) {

    public static SyncHandlerResult applied(
            Long version,
            List<SyncChangeCommand> changes
    ) {
        return new SyncHandlerResult(
                SyncMutationStatus.APPLIED,
                version,
                null,
                null,
                changes
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
                message,
                List.of()
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
                message,
                List.of()
        );
    }
}
