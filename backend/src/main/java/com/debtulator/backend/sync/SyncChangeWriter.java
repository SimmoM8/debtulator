package com.debtulator.backend.sync;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SyncChangeWriter {

    private final SyncChangeRepository syncChangeRepository;
    private final Clock clock;

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID ownerUserId, List<SyncChangeCommand> changes) {
        Instant changedAt = Instant.now(clock);

        for (SyncChangeCommand change : changes) {
            syncChangeRepository.save(
                    new SyncChange(ownerUserId, change, changedAt)
            );
        }
    }
}

