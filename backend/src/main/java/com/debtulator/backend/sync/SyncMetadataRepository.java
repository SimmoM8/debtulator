package com.debtulator.backend.sync;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncMetadataRepository extends JpaRepository<SyncMetadata, Short> {
}

