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

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                ownerUserId
        );
    }

    @Test
    void findsMembersByOwnerOrderedByDisplayName() {
        Instant now = Instant.now();

        memberRepository.save(
                new Member(
                        UUID.randomUUID(),
                        ownerUserId,
                        "Zoe",
                        null,
                        now,
                        now
                )
        );

        memberRepository.save(
                new Member(
                        UUID.randomUUID(),
                        ownerUserId,
                        "Alice",
                        null,
                        now,
                        now
                )
        );

        List<Member> members =
                memberRepository.findAllByOwnerUserIdOrderByDisplayNameAsc(
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

        memberRepository.save(
                new Member(
                        memberId,
                        ownerUserId,
                        "Benjamin",
                        null,
                        now,
                        now
                )
        );

        Optional<Member> result =
                memberRepository.findByIdAndOwnerUserId(
                        memberId,
                        ownerUserId
                );

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getDisplayName())
                .isEqualTo("Benjamin");
    }

    @Test
    void doesNotReturnMemberOwnedByAnotherUser() {
        UUID otherUserId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Instant now = Instant.now();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                otherUserId
        );

        memberRepository.save(
                new Member(
                        memberId,
                        otherUserId,
                        "Other member",
                        null,
                        now,
                        now
                )
        );

        Optional<Member> result =
                memberRepository.findByIdAndOwnerUserId(
                        memberId,
                        ownerUserId
                );

        assertThat(result).isEmpty();
    }

    @Test
    void detectsLinkedUserForOwner() {
        UUID linkedUserId = UUID.randomUUID();
        Instant now = Instant.now();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                linkedUserId
        );

        memberRepository.save(
                new Member(
                        UUID.randomUUID(),
                        ownerUserId,
                        "Linked member",
                        linkedUserId,
                        now,
                        now
                )
        );

        boolean exists =
                memberRepository.existsByOwnerUserIdAndLinkedUserId(
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

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                otherOwnerUserId
        );

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                linkedUserId
        );

        memberRepository.save(
                new Member(
                        UUID.randomUUID(),
                        otherOwnerUserId,
                        "Linked member",
                        linkedUserId,
                        now,
                        now
                )
        );

        boolean exists =
                memberRepository.existsByOwnerUserIdAndLinkedUserId(
                        ownerUserId,
                        linkedUserId
                );

        assertThat(exists).isFalse();
    }
}
