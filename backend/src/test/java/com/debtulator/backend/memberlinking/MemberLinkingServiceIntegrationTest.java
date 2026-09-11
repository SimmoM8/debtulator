package com.debtulator.backend.memberlinking;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.members.MemberRepository;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.profiles.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class MemberLinkingServiceIntegrationTest {
    @Autowired private MemberLinkingService memberLinkingService;
    @Autowired private MemberService memberService;
    @Autowired private MemberRepository memberRepository;
    @Autowired private ProfileService profileService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID aliceUserId;
    private UUID bobUserId;
    private UUID charlieUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.agreement_entity_states");
        jdbcTemplate.update("delete from public.agreement_requests");
        jdbcTemplate.update("delete from public.member_link_requests");
        jdbcTemplate.update("delete from public.user_discovery_rate_limits");
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        aliceUserId = createUser("alice@example.com", "Alice");
        bobUserId = createUser("bob@example.com", "Bob");
        charlieUserId = createUser("charlie@example.com", "Charlie");
    }

    @Test
    void directRequestCreatesOneUnlinkedMemberAndIsRetrySafe() {
        UUID requestId = UUID.randomUUID();

        var first = memberLinkingService.createRequest(
                aliceUserId,
                requestId,
                bobUserId,
                null,
                null,
                true
        );

        var retry = memberLinkingService.createRequest(
                aliceUserId,
                requestId,
                bobUserId,
                null,
                null,
                true
        );

        assertThat(retry.id()).isEqualTo(first.id());
        assertThat(retry.memberId()).isEqualTo(first.memberId());
        assertThat(memberRepository.count()).isEqualTo(1);
        assertThat(memberRepository.findById(first.memberId()).orElseThrow().getDisplayName())
                .isEqualTo("Bob");
        assertThat(memberRepository.findById(first.memberId()).orElseThrow().getLinkedUserId())
                .isNull();
    }

    @Test
    void sameMemberCannotBackMultiplePendingLinkRequests() {
        UUID memberId = UUID.randomUUID();
        memberService.create(
                aliceUserId,
                memberId,
                "Friend",
                Instant.now()
        );

        memberLinkingService.createRequest(
                aliceUserId,
                UUID.randomUUID(),
                bobUserId,
                memberId,
                null,
                false
        );

        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        UUID.randomUUID(),
                        charlieUserId,
                        memberId,
                        null,
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason.MEMBER_ALREADY_PENDING
                                )
                );
    }

    @Test
    void pendingLinkMemberCannotBeDeletedUntilRequestIsResolved() {
        UUID memberId = UUID.randomUUID();
        var member = memberService.create(
                aliceUserId,
                memberId,
                "Bob",
                Instant.now()
        );

        memberLinkingService.createRequest(
                aliceUserId,
                UUID.randomUUID(),
                bobUserId,
                memberId,
                null,
                false
        );

        assertThatThrownBy(() ->
                memberService.delete(
                        aliceUserId,
                        memberId,
                        member.getVersion()
                )
        )
                .isInstanceOfSatisfying(
                        com.debtulator.backend.members.MemberServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        com.debtulator.backend.members.MemberServiceException.Reason.LINK_PENDING
                                )
                );
    }

    @Test
    void acceptanceAndUnlinkAreRetrySafe() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                UUID.randomUUID(),
                bobUserId,
                null,
                "Bobby",
                false
        );

        var accepted = memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );
        var acceptedRetry = memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );

        assertThat(acceptedRetry.status()).isEqualTo("accepted");
        assertThat(acceptedRetry.memberId()).isEqualTo(accepted.memberId());

        memberLinkingService.unlink(
                aliceUserId,
                request.id()
        );
        memberLinkingService.unlink(
                aliceUserId,
                request.id()
        );
    }

    private UUID createUser(String email, String name) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "insert into auth.users (id, email) values (?, ?)",
                id,
                email
        );
        profileService.update(id, name, "SEK");
        return id;
    }
}
