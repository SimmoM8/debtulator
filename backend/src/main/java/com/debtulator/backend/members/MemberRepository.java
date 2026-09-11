package com.debtulator.backend.members;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    List<Member> findAllByOwnerUserIdAndDeletedAtIsNullOrderByDisplayNameAsc(UUID ownerUserId);

    Optional<Member> findByIdAndOwnerUserIdAndDeletedAtIsNull(UUID id, UUID ownerUserId);

    Optional<Member> findByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
            UUID ownerUserId,
            UUID linkedUserId
    );

    boolean existsByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
            UUID ownerUserId,
            UUID linkedUserId
    );

    @Query(value = """
            select exists (
                select 1
                from public.member_link_requests request
                where request.requester_user_id = :ownerUserId
                  and request.requester_member_id = :memberId
                  and request.status = 'pending'
            )
            """, nativeQuery = true)
    boolean existsPendingLinkRequest(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("memberId") UUID memberId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select member from Member member
            where member.id = :id and member.ownerUserId = :ownerUserId
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
