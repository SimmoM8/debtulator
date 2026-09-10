package com.debtulator.backend.sync;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SyncChangeRepository extends JpaRepository<SyncChange, Long> {

    List<SyncChange> findByOwnerUserIdAndSequenceGreaterThanOrderBySequenceAsc(
            UUID ownerUserId,
            long sequence,
            Pageable pageable
    );

    @Query("select coalesce(max(syncChange.sequence), 0L) from SyncChange syncChange")
    long findCurrentCursor();
}
