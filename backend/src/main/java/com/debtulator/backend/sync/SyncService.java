package com.debtulator.backend.sync;

import com.debtulator.backend.exceptions.InvalidSyncRequestException;
import com.debtulator.backend.exceptions.SyncCursorExpiredException;
import com.debtulator.backend.sync.dto.BootstrapStartResponse;
import com.debtulator.backend.sync.dto.PullSyncResponse;
import com.debtulator.backend.sync.dto.PushSyncRequest;
import com.debtulator.backend.sync.dto.PushSyncResponse;
import com.debtulator.backend.sync.dto.SyncBootstrapPageResponse;
import com.debtulator.backend.sync.dto.SyncChangeResponse;
import com.debtulator.backend.sync.dto.SyncMutationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService {

    private final SyncMutationProcessor mutationProcessor;
    private final SyncChangeRepository syncChangeRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final SyncEntityHandlerRegistry handlerRegistry;

    public PushSyncResponse push(UUID ownerUserId, PushSyncRequest request) {
        if (request.mutations().size() > SyncLimits.MAX_PUSH_BATCH_SIZE) {
            throw new InvalidSyncRequestException(
                    "A sync push may contain at most "
                            + SyncLimits.MAX_PUSH_BATCH_SIZE
                            + " mutations."
            );
        }

        List<SyncMutationResult> results = new ArrayList<>(request.mutations().size());

        for (var mutation : request.mutations()) {
            try {
                results.add(mutationProcessor.process(ownerUserId, mutation));
            } catch (RuntimeException exception) {
                log.error("Sync mutation {} failed unexpectedly.", mutation.id(), exception);
                results.add(SyncMutationResult.retry(
                        mutation,
                        SyncErrorCode.TEMPORARY_FAILURE,
                        "The mutation could not be processed and should be retried."
                ));
            }
        }

        return new PushSyncResponse(results);
    }

    @Transactional(readOnly = true)
    public PullSyncResponse pull(
            UUID ownerUserId,
            long after,
            int limit
    ) {
        validateCursor(after);
        int pageSize = validatePageSize(limit, SyncLimits.MAX_PULL_PAGE_SIZE);
        validateRetentionFloor(after);

        List<SyncChange> rows = syncChangeRepository
                .findByOwnerUserIdAndSequenceGreaterThanOrderBySequenceAsc(
                        ownerUserId,
                        after,
                        PageRequest.of(0, pageSize + 1)
                );

        boolean hasMore = rows.size() > pageSize;
        List<SyncChange> page = hasMore
                ? rows.subList(0, pageSize)
                : rows;

        List<SyncChangeResponse> changes = page.stream()
                .map(SyncChangeResponse::from)
                .toList();

        long nextCursor = page.isEmpty()
                ? after
                : page.getLast().getSequence();

        return new PullSyncResponse(
                changes,
                Long.toString(nextCursor),
                hasMore
        );
    }

    @Transactional(readOnly = true)
    public BootstrapStartResponse startBootstrap(UUID ownerUserId) {
        long cursor = syncChangeRepository.findCurrentCursor();
        List<String> entityTypes = handlerRegistry.supportedEntityTypes().stream()
                .map(SyncEntityType::getValue)
                .toList();

        return new BootstrapStartResponse(Long.toString(cursor), entityTypes);
    }

    @Transactional(readOnly = true)
    public SyncBootstrapPageResponse bootstrap(
            UUID ownerUserId,
            String entityTypeValue,
            UUID afterId,
            int limit
    ) {
        SyncEntityType entityType = SyncEntityType
                .fromValue(entityTypeValue)
                .orElseThrow(() -> new InvalidSyncRequestException(
                        "Unsupported sync entity type: " + entityTypeValue
                ));

        int pageSize = validatePageSize(
                limit,
                SyncLimits.MAX_BOOTSTRAP_PAGE_SIZE
        );

        SyncBootstrapBatch batch = handlerRegistry
                .get(entityType)
                .bootstrap(ownerUserId, afterId, pageSize);

        return new SyncBootstrapPageResponse(
                entityType.getValue(),
                batch.items(),
                batch.nextAfterId(),
                batch.hasMore()
        );
    }

    private void validateCursor(long cursor) {
        if (cursor < 0) {
            throw new InvalidSyncRequestException("Sync cursor must be zero or greater.");
        }
    }

    private int validatePageSize(int limit, int maximum) {
        if (limit < 1 || limit > maximum) {
            throw new InvalidSyncRequestException(
                    "Page size must be between 1 and " + maximum + "."
            );
        }
        return limit;
    }

    private void validateRetentionFloor(long cursor) {
        SyncMetadata metadata = syncMetadataRepository
                .findById(SyncMetadata.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "Sync metadata has not been initialized."
                ));

        if (cursor < metadata.getRetainedFromSequence()) {
            throw new SyncCursorExpiredException(
                    metadata.getRetainedFromSequence()
            );
        }
    }
}
