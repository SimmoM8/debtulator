package com.debtulator.backend.members;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {

    List<Member> findAllByOwnerUserIdOrderByDisplayNameAsc(UUID ownerUserId);

    Optional<Member> findByIdAndOwnerUserId(
            UUID id,
            UUID ownerUserId
    );

    boolean existsByOwnerUserIdAndLinkedUserId(
            UUID ownerUserId,
            UUID linkedUserId
    );
}
