package com.debtulator.backend.debts;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DebtRepository extends JpaRepository<Debt, UUID> {

    Optional<Debt> findByIdAndOwnerUserIdAndDeletedAtIsNull(
            UUID id,
            UUID ownerUserId
    );

    boolean existsByOwnerUserIdAndMemberIdAndDeletedAtIsNull(
            UUID ownerUserId,
            UUID memberId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select debt
            from Debt debt
            where debt.id = :id
              and debt.ownerUserId = :ownerUserId
            """)
    Optional<Debt> findForUpdate(
            @Param("id") UUID id,
            @Param("ownerUserId") UUID ownerUserId
    );

    List<Debt> findByOwnerUserIdAndDeletedAtIsNullOrderByIdAsc(
            UUID ownerUserId,
            Pageable pageable
    );

    List<Debt> findByOwnerUserIdAndDeletedAtIsNullAndIdGreaterThanOrderByIdAsc(
            UUID ownerUserId,
            UUID id,
            Pageable pageable
    );
}
