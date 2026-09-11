package com.debtulator.backend.memberlinking;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberLinkRequestRepository extends JpaRepository<MemberLinkRequest, UUID> {
    @Query("""
            select request from MemberLinkRequest request
            where request.targetUserId = :userId and request.status = 'pending'
            order by request.createdAt desc
            """)
    List<MemberLinkRequest> findPendingIncoming(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            select request from MemberLinkRequest request
            where request.requesterUserId = :userId and request.status = 'pending'
            order by request.createdAt desc
            """)
    List<MemberLinkRequest> findPendingOutgoing(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            select request from MemberLinkRequest request
            where request.status = 'pending' and (
                (request.requesterUserId = :firstUserId and request.targetUserId = :secondUserId)
                or
                (request.requesterUserId = :secondUserId and request.targetUserId = :firstUserId)
            )
            """)
    Optional<MemberLinkRequest> findPendingBetweenUsers(
            @Param("firstUserId") UUID firstUserId,
            @Param("secondUserId") UUID secondUserId
    );

    @Query("""
            select case when count(request) > 0 then true else false end
            from MemberLinkRequest request
            where request.status = 'pending'
              and request.requesterUserId = :ownerUserId
              and request.requesterMemberId = :memberId
            """)
    boolean existsPendingForRequesterMember(
            @Param("ownerUserId") UUID ownerUserId,
            @Param("memberId") UUID memberId
    );

    @Query("""
            select case when count(request) > 0 then true else false end
            from MemberLinkRequest request
            where request.status = 'accepted' and (
                (request.requesterUserId = :firstUserId and request.targetUserId = :secondUserId)
                or
                (request.requesterUserId = :secondUserId and request.targetUserId = :firstUserId)
            )
            """)
    boolean existsActiveBetweenUsers(
            @Param("firstUserId") UUID firstUserId,
            @Param("secondUserId") UUID secondUserId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select request from MemberLinkRequest request
            where request.id = :requestId and request.targetUserId = :targetUserId
            """)
    Optional<MemberLinkRequest> findForTargetUpdate(
            @Param("requestId") UUID requestId,
            @Param("targetUserId") UUID targetUserId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select request from MemberLinkRequest request
            where request.id = :requestId and request.requesterUserId = :requesterUserId
            """)
    Optional<MemberLinkRequest> findForRequesterUpdate(
            @Param("requestId") UUID requestId,
            @Param("requesterUserId") UUID requesterUserId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select request from MemberLinkRequest request
            where request.id = :linkId
              and (
                    request.requesterUserId = :userId
                    or request.targetUserId = :userId
              )
              and request.status in ('accepted', 'unlinked')
            """)
    Optional<MemberLinkRequest> findLinkForParticipantUpdate(
            @Param("linkId") UUID linkId,
            @Param("userId") UUID userId
    );

}
