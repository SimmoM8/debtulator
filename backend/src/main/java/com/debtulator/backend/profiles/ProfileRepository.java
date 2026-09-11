package com.debtulator.backend.profiles;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select profile
            from Profile profile
            where profile.userId = :userId
            """)
    Optional<Profile> findForUpdate(@Param("userId") UUID userId);
}
