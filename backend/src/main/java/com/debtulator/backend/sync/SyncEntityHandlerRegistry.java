package com.debtulator.backend.sync;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class SyncEntityHandlerRegistry {

    private final Map<SyncEntityType, SyncEntityHandler> handlers;

    public SyncEntityHandlerRegistry(List<SyncEntityHandler> handlers) {
        EnumMap<SyncEntityType, SyncEntityHandler> mapped =
                new EnumMap<>(SyncEntityType.class);

        for (SyncEntityHandler handler : handlers) {
            SyncEntityHandler previous = mapped.put(handler.entityType(), handler);
            if (previous != null) {
                throw new IllegalStateException(
                        "Duplicate sync handler for " + handler.entityType().getValue()
                );
            }
        }

        for (SyncEntityType entityType : SyncEntityType.values()) {
            if (!mapped.containsKey(entityType)) {
                throw new IllegalStateException(
                        "Missing sync handler for " + entityType.getValue()
                );
            }
        }

        this.handlers = Map.copyOf(mapped);
    }

    public SyncEntityHandler get(SyncEntityType entityType) {
        return handlers.get(entityType);
    }

    public List<SyncEntityType> supportedEntityTypes() {
        return List.of(SyncEntityType.values());
    }
}
