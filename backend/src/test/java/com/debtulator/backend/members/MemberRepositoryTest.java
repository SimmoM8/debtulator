package com.debtulator.backend.members;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID ownerUserId;

    @BeforeEach
    void setUp() {
        ownerUserId = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id) values (?)", ownerUserId);
    }

    @Test
    void findsMembersByOwnerOrderedByDisplayName() {
        Instant now = Instant.now();

        memberRepository.save(new Member(
                UUID.randomUUID(), ownerUserId, "Zoe", now, now
        ));
        memberRepository.save(new Member(
                UUID.randomUUID(), ownerUserId, "Alice", now, now
        ));

        List<Member> members =
                memberRepository.findAllByOwnerUserIdAndDeletedAtIsNullOrderByDisplayNameAsc(
                        ownerUserId
                );

        assertThat(members)
                .extracting(Member::getDisplayName)
                .containsExactly("Alice", "Zoe");
    }

    @Test
    void findsMemberByIdAndOwner() {
        UUID memberId = UUID.randomUUID();
        Instant now = Instant.now();

        memberRepository.save(new Member(
                memberId, ownerUserId, "Benjamin", now, now
        ));

        Optional<Member> result =
                memberRepository.findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        memberId,
                        ownerUserId
                );

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getDisplayName()).isEqualTo("Benjamin");
    }

    @Test
    void doesNotReturnMemberOwnedByAnotherUser() {
        UUID otherOwnerUserId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Instant now = Instant.now();

        jdbcTemplate.update("insert into auth.users (id) values (?)", otherOwnerUserId);
        memberRepository.save(new Member(
                memberId, otherOwnerUserId, "Other member", now, now
        ));

        Optional<Member> result =
                memberRepository.findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        memberId,
                        ownerUserId
                );

        assertThat(result).isEmpty();
    }

    @Test
    void detectsLinkedUserForOwner() {
        UUID linkedUserId = UUID.randomUUID();
        Instant now = Instant.now();

        jdbcTemplate.update("insert into auth.users (id) values (?)", linkedUserId);

        Member member = new Member(
                UUID.randomUUID(), ownerUserId, "Linked member", now, now
        );
        memberRepository.saveAndFlush(member);
        member.linkToUser(linkedUserId, now.plusSeconds(1));
        memberRepository.flush();

        boolean exists =
                memberRepository.existsByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
                        ownerUserId,
                        linkedUserId
                );

        assertThat(exists).isTrue();
    }

    @Test
    void doesNotDetectLinkedUserForAnotherOwner() {
        UUID otherOwnerUserId = UUID.randomUUID();
        UUID linkedUserId = UUID.randomUUID();
        Instant now = Instant.now();

        jdbcTemplate.update("insert into auth.users (id) values (?)", otherOwnerUserId);
        jdbcTemplate.update("insert into auth.users (id) values (?)", linkedUserId);

        Member member = new Member(
                UUID.randomUUID(), otherOwnerUserId, "Linked member", now, now
        );
        memberRepository.saveAndFlush(member);
        member.linkToUser(linkedUserId, now.plusSeconds(1));
        memberRepository.flush();

        boolean exists =
                memberRepository.existsByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
                        ownerUserId,
                        linkedUserId
                );

        assertThat(exists).isFalse();
    }

    @Test
    void excludesSoftDeletedMembersFromNormalQueries() {
        Instant now = Instant.now();
        Member member = memberRepository.saveAndFlush(new Member(
                UUID.randomUUID(), ownerUserId, "Benjamin", now, now
        ));

        member.delete(now.plusSeconds(1));
        memberRepository.flush();

        assertThat(
                memberRepository.findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        member.getId(), ownerUserId
                )
        ).isEmpty();
    }

    @Test
    void incrementsVersionWhenMemberChanges() {
        Instant now = Instant.now();
        Member member = memberRepository.saveAndFlush(new Member(
                UUID.randomUUID(), ownerUserId, "Benjamin", now, now
        ));

        assertThat(member.getVersion()).isZero();

        member.rename("Ben", now.plusSeconds(10));
        memberRepository.flush();

        assertThat(member.getVersion()).isEqualTo(1L);
    }
}

