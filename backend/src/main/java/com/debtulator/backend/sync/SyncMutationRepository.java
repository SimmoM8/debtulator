package com.debtulator.backend.sync;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SyncMutationRepository extends JpaRepository<SyncMutation, UUID> {
}
