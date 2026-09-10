package com.debtulator.backend.members;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name = "members", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    private UUID id;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "linked_user_id")
    private UUID linkedUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public Member(
            UUID id,
            UUID ownerUserId,
            String displayName,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.ownerUserId = ownerUserId;
        this.displayName = displayName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void rename(String displayName, Instant updatedAt) {
        this.displayName = displayName;
        this.updatedAt = updatedAt;
    }

    public void linkToUser(UUID linkedUserId, Instant updatedAt) {
        this.linkedUserId = linkedUserId;
        this.updatedAt = updatedAt;
    }

    public void unlink(Instant updatedAt) {
        this.linkedUserId = null;
        this.updatedAt = updatedAt;
    }

    public void delete(Instant deletedAt) {
        this.deletedAt = deletedAt;
        this.updatedAt = deletedAt;
    }
}
