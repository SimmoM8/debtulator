package com.debtulator.backend.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "sync_mutations", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SyncMutation {

    @Id
    private UUID id;

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

    @Column(name = "base_version")
    private Long baseVersion;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(nullable = false)
    private String status;

    @Column(name = "result_version")
    private Long resultVersion;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public SyncMutation(
            UUID ownerUserId,
            SyncMutationCommand command,
            String requestHash,
            SyncHandlerResult result,
            Instant processedAt
    ) {
        this.id = command.id();
        this.ownerUserId = ownerUserId;
        this.entityType = command.entityType().getValue();
        this.entityId = command.entityId();
        this.operation = command.operation().getValue();
        this.payload = command.payload();
        this.baseVersion = command.baseVersion();
        this.requestHash = requestHash;
        this.status = result.status().getValue();
        this.resultVersion = result.version();
        this.errorCode = result.errorCode() != null
                ? result.errorCode().name()
                : null;
        this.errorMessage = result.message();
        this.processedAt = processedAt;
    }
}
