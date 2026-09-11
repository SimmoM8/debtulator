package com.debtulator.backend.profiles;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name = "profiles", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "base_currency", nullable = false)
    private String baseCurrency;

    @Column(name = "member_discovery_enabled", nullable = false)
    private boolean memberDiscoveryEnabled;

    @Column(name = "discoverable_by_display_name", nullable = false)
    private boolean discoverableByDisplayName;

    @Column(name = "discoverable_by_email", nullable = false)
    private boolean discoverableByEmail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void update(
            String displayName,
            String baseCurrency,
            Instant updatedAt
    ) {
        this.displayName = displayName;
        this.baseCurrency = baseCurrency;
        this.updatedAt = updatedAt;
    }

    public void updateDiscoveryPreferences(
            boolean memberDiscoveryEnabled,
            boolean discoverableByDisplayName,
            boolean discoverableByEmail,
            Instant updatedAt
    ) {
        this.memberDiscoveryEnabled = memberDiscoveryEnabled;
        this.discoverableByDisplayName = discoverableByDisplayName;
        this.discoverableByEmail = discoverableByEmail;
        this.updatedAt = updatedAt;
    }
}
