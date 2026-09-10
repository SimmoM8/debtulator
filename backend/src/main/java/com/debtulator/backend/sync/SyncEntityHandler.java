package com.debtulator.backend.sync;

import java.util.UUID;

public interface SyncEntityHandler {

    SyncEntityType entityType();

    SyncHandlerResult applyMutation(
            UUID ownerUserId,
            SyncMutationCommand mutation
    );

    SyncBootstrapBatch bootstrap(
            UUID ownerUserId,
            UUID afterId,
            int limit
    );
}
