package com.debtulator.backend.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Entity
@Table(name = "sync_changes", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SyncChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sequence;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(nullable = false)
    private String operation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    public SyncChange(
            UUID ownerUserId,
            SyncChangeCommand command,
            Instant changedAt
    ) {
        this.ownerUserId = ownerUserId;
        this.entityType = command.entityType().getValue();
        this.entityId = command.entityId();
        this.operation = command.operation().getValue();
        this.payload = command.payload();
        this.changedAt = changedAt;
    }
}
