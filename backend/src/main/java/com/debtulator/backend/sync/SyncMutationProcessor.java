package com.debtulator.backend.sync;

import com.debtulator.backend.sync.dto.SyncMutationRequest;
import com.debtulator.backend.sync.dto.SyncMutationResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SyncMutationProcessor {

    private final SyncMutationRepository syncMutationRepository;
    private final SyncEntityHandlerRegistry handlerRegistry;
    private final SyncChangeWriter syncChangeWriter;
    private final SyncRequestHasher requestHasher;
    private final Clock clock;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncMutationResult process(
            UUID ownerUserId,
            SyncMutationRequest request
    ) {
        SyncEntityType entityType = SyncEntityType
                .fromValue(request.entityType())
                .orElse(null);

        if (entityType == null) {
            return SyncMutationResult.rejected(
                    request,
                    SyncErrorCode.INVALID_ENTITY_TYPE,
                    "Unsupported sync entity type.",
                    false
            );
        }

        SyncOperation operation = SyncOperation
                .fromValue(request.operation())
                .orElse(null);

        if (operation == null) {
            return SyncMutationResult.rejected(
                    request,
                    SyncErrorCode.INVALID_OPERATION,
                    "Unsupported sync operation.",
                    false
            );
        }

        SyncMutationCommand command = new SyncMutationCommand(
                request.id(),
                entityType,
                request.entityId(),
                operation,
                request.baseVersion(),
                request.payload()
        );

        String requestHash = requestHasher.hash(ownerUserId, command);

        var existing = syncMutationRepository.findById(request.id());
        if (existing.isPresent()) {
            SyncMutation mutation = existing.get();

            if (!mutation.getOwnerUserId().equals(ownerUserId)
                    || !mutation.getRequestHash().equals(requestHash)) {
                return SyncMutationResult.rejected(
                        request,
                        SyncErrorCode.IDEMPOTENCY_KEY_REUSED,
                        "The mutation ID has already been used for a different request.",
                        false
                );
            }

            return SyncMutationResult.fromStored(mutation, true);
        }

        SyncHandlerResult result = validateEnvelope(command);
        if (result == null) {
            result = handlerRegistry
                    .get(entityType)
                    .applyMutation(ownerUserId, command);
        }

        if (!result.changes().isEmpty()) {
            syncChangeWriter.record(ownerUserId, result.changes());
        }

        syncMutationRepository.save(
                new SyncMutation(
                        ownerUserId,
                        command,
                        requestHash,
                        result,
                        Instant.now(clock)
                )
        );

        return SyncMutationResult.from(command, result, false);
    }

    private SyncHandlerResult validateEnvelope(SyncMutationCommand command) {
        if (command.baseVersion() != null && command.baseVersion() < 0) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "baseVersion must be zero or greater."
            );
        }

        if (command.operation() == SyncOperation.UPSERT && command.payload() == null) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "Upsert mutations require a payload."
            );
        }

        if (command.operation() == SyncOperation.DELETE && command.payload() != null) {
            return SyncHandlerResult.rejected(
                    SyncErrorCode.INVALID_PAYLOAD,
                    "Delete mutations must not include a payload."
            );
        }

        return null;
    }
}

