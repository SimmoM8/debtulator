package com.debtulator.backend.members;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {

    List<Member> findAllByOwnerUserIdAndDeletedAtIsNullOrderByDisplayNameAsc(
            UUID ownerUserId
    );

    Optional<Member> findByIdAndOwnerUserIdAndDeletedAtIsNull(
            UUID id,
            UUID ownerUserId
    );

    Optional<Member> findByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
            UUID ownerUserId,
            UUID linkedUserId
    );

    boolean existsByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
            UUID ownerUserId,
            UUID linkedUserId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select member
            from Member member
            where member.id = :id
              and member.ownerUserId = :ownerUserId
            """)
    Optional<Member> findForUpdate(
            @Param("id") UUID id,
            @Param("ownerUserId") UUID ownerUserId
    );

    List<Member> findByOwnerUserIdAndDeletedAtIsNullOrderByIdAsc(
            UUID ownerUserId,
            Pageable pageable
    );

    List<Member> findByOwnerUserIdAndDeletedAtIsNullAndIdGreaterThanOrderByIdAsc(
            UUID ownerUserId,
            UUID id,
            Pageable pageable
    );
}
