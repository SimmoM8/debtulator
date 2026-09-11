package com.debtulator.backend.sync.dto;

import com.debtulator.backend.sync.SyncErrorCode;
import com.debtulator.backend.sync.SyncHandlerResult;
import com.debtulator.backend.sync.SyncMutation;
import com.debtulator.backend.sync.SyncMutationCommand;
import com.debtulator.backend.sync.SyncMutationStatus;

import java.util.UUID;

public record SyncMutationResult(
        UUID mutationId,
        String status,
        String entityType,
        UUID entityId,
        Long version,
        String errorCode,
        String message,
        boolean replayed
) {

    public static SyncMutationResult from(
            SyncMutationCommand command,
            SyncHandlerResult result,
            boolean replayed
    ) {
        return new SyncMutationResult(
                command.id(),
                result.status().getValue(),
                command.entityType().getValue(),
                command.entityId(),
                result.version(),
                result.errorCode() != null ? result.errorCode().name() : null,
                result.message(),
                replayed
        );
    }

    public static SyncMutationResult fromStored(
            SyncMutation mutation,
            boolean replayed
    ) {
        return new SyncMutationResult(
                mutation.getId(),
                mutation.getStatus(),
                mutation.getEntityType(),
                mutation.getEntityId(),
                mutation.getResultVersion(),
                mutation.getErrorCode(),
                mutation.getErrorMessage(),
                replayed
        );
    }

    public static SyncMutationResult rejected(
            SyncMutationRequest request,
            SyncErrorCode errorCode,
            String message,
            boolean replayed
    ) {
        return new SyncMutationResult(
                request.id(),
                SyncMutationStatus.REJECTED.getValue(),
                request.entityType(),
                request.entityId(),
                null,
                errorCode.name(),
                message,
                replayed
        );
    }

    public static SyncMutationResult retry(
            SyncMutationRequest request,
            SyncErrorCode errorCode,
            String message
    ) {
        return new SyncMutationResult(
                request.id(),
                SyncMutationStatus.RETRY.getValue(),
                request.entityType(),
                request.entityId(),
                null,
                errorCode.name(),
                message,
                false
        );
    }
}

