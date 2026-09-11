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
}
