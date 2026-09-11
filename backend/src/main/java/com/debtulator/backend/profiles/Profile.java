package com.debtulator.backend.profiles;

import jakarta.persistence.*;
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
    @Id @Column(name = "user_id") private UUID userId;
    @Column(length = 120) private String name;
    @Column(name = "base_currency", nullable = false) private String baseCurrency;
    @Column(name = "member_discovery_enabled", nullable = false) private boolean memberDiscoveryEnabled;
    @Column(name = "discoverable_by_name", nullable = false) private boolean discoverableByName;
    @Column(name = "discoverable_by_email", nullable = false) private boolean discoverableByEmail;
    @Column(name = "incoming_member_link_requests_enabled", nullable = false) private boolean incomingMemberLinkRequestsEnabled;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public void update(String name, String baseCurrency, Instant updatedAt) {
        this.name = name;
        this.baseCurrency = baseCurrency;
        this.updatedAt = updatedAt;
    }

    public void updateDiscoveryPreferences(boolean memberDiscoveryEnabled, boolean discoverableByName,
                                           boolean discoverableByEmail, Instant updatedAt) {
        this.memberDiscoveryEnabled = memberDiscoveryEnabled;
        this.discoverableByName = discoverableByName;
        this.discoverableByEmail = discoverableByEmail;
        this.updatedAt = updatedAt;
    }

    public void updateIncomingMemberLinkRequestsEnabled(boolean enabled, Instant updatedAt) {
        this.incomingMemberLinkRequestsEnabled = enabled;
        this.updatedAt = updatedAt;
    }
}
