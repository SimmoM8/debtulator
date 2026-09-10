package com.debtulator.backend.debts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Entity
@Table(name = "debts", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Debt {

    @Id
    private UUID id;

    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;

    @Column(nullable = false)
    private String direction;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public Debt(
            UUID id,
            UUID ownerUserId,
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title,
            LocalDate dueDate,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.ownerUserId = ownerUserId;
        this.memberId = memberId;
        this.direction = direction;
        this.amount = amount;
        this.currency = currency;
        this.title = title;
        this.dueDate = dueDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void update(
            UUID memberId,
            String direction,
            BigDecimal amount,
            String currency,
            String title,
            LocalDate dueDate,
            Instant updatedAt
    ) {
        this.memberId = memberId;
        this.direction = direction;
        this.amount = amount;
        this.currency = currency;
        this.title = title;
        this.dueDate = dueDate;
        this.updatedAt = updatedAt;
    }

    public void delete(Instant deletedAt) {
        this.deletedAt = deletedAt;
        this.updatedAt = deletedAt;
    }
}
