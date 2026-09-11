package com.debtulator.backend.memberlinking;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.debts.DebtService;
import com.debtulator.backend.members.Member;
import com.debtulator.backend.members.MemberRepository;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.profiles.ProfileService;
import com.debtulator.backend.sync.SyncChangeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class MemberLinkingServiceIntegrationTest {

    @Autowired
    private MemberLinkingService memberLinkingService;

    @Autowired
    private MemberLinkRequestRepository requestRepository;

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private DebtService debtService;

    @Autowired
    private DebtRepository debtRepository;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private SyncChangeRepository syncChangeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID aliceUserId;
    private UUID bobUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.member_link_requests");
        jdbcTemplate.update("delete from public.user_discovery_rate_limits");
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        aliceUserId = createUser("alice@example.com", "Alice");
        bobUserId = createUser("bob@example.com", "Bob");
        syncChangeRepository.deleteAll();
    }

    @Test
    void directFlowCreatesUnlinkedMemberImmediatelyUsingTargetProfileName() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                null,
                true
        );

        Member member = memberRepository
                .findById(request.memberId())
                .orElseThrow();

        assertThat(member.getOwnerUserId()).isEqualTo(aliceUserId);
        assertThat(member.getDisplayName()).isEqualTo("Bob");
        assertThat(member.getLinkedUserId()).isNull();
        assertThat(request.status()).isEqualTo("pending");
        assertThat(syncChangeRepository.count()).isEqualTo(1);
    }

    @Test
    void directFlowCanCreateUnlinkedMemberWithCustomDisplayName() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        Member member = memberRepository
                .findById(request.memberId())
                .orElseThrow();

        assertThat(member.getDisplayName()).isEqualTo("Bobby");
        assertThat(member.getLinkedUserId()).isNull();
    }

    @Test
    void directFlowRequiresExactlyOneNamingChoice() {
        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        bobUserId,
                        null,
                        null,
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason.INVALID_NAME_SELECTION
                                )
                );

        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        bobUserId,
                        null,
                        "Bobby",
                        true
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason.INVALID_NAME_SELECTION
                                )
                );
    }

    @Test
    void rejectionLeavesDirectlyCreatedMemberPrivateAndUnlinked() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        memberLinkingService.rejectRequest(
                bobUserId,
                request.id()
        );

        Member member = memberRepository
                .findById(request.memberId())
                .orElseThrow();

        assertThat(member.getDisplayName()).isEqualTo("Bobby");
        assertThat(member.getLinkedUserId()).isNull();
        assertThat(
                requestRepository.findById(request.id())
                        .orElseThrow()
                        .getStatus()
        ).isEqualTo("rejected");
    }

    @Test
    void linkingExistingMemberCanKeepItsCurrentDisplayName() {
        UUID aliceMemberId = UUID.randomUUID();

        memberService.create(
                aliceUserId,
                aliceMemberId,
                "My Bob",
                Instant.now()
        );
        syncChangeRepository.deleteAll();

        memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                aliceMemberId,
                null,
                false
        );

        Member member = memberRepository
                .findById(aliceMemberId)
                .orElseThrow();

        assertThat(member.getDisplayName()).isEqualTo("My Bob");
        assertThat(member.getLinkedUserId()).isNull();
        assertThat(syncChangeRepository.count()).isZero();
    }

    @Test
    void linkingExistingMemberCanReplaceNameWithTargetProfileNameBeforeAcceptance() {
        UUID aliceMemberId = UUID.randomUUID();

        memberService.create(
                aliceUserId,
                aliceMemberId,
                "Old nickname",
                Instant.now()
        );
        syncChangeRepository.deleteAll();

        memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                aliceMemberId,
                null,
                true
        );

        Member member = memberRepository
                .findById(aliceMemberId)
                .orElseThrow();

        assertThat(member.getDisplayName()).isEqualTo("Bob");
        assertThat(member.getLinkedUserId()).isNull();
        assertThat(syncChangeRepository.count()).isEqualTo(1);
    }

    @Test
    void acceptanceCanRenameExistingTargetMemberToRequesterProfileName() {
        UUID aliceMemberId = UUID.randomUUID();
        UUID bobMemberId = UUID.randomUUID();

        memberService.create(
                aliceUserId,
                aliceMemberId,
                "Bob",
                Instant.now()
        );
        memberService.create(
                bobUserId,
                bobMemberId,
                "Some Alice",
                Instant.now()
        );
        syncChangeRepository.deleteAll();

        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                aliceMemberId,
                null,
                false
        );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                bobMemberId,
                null,
                true
        );

        Member aliceMember = memberRepository
                .findById(aliceMemberId)
                .orElseThrow();
        Member bobMember = memberRepository
                .findById(bobMemberId)
                .orElseThrow();

        assertThat(aliceMember.getLinkedUserId()).isEqualTo(bobUserId);
        assertThat(bobMember.getLinkedUserId()).isEqualTo(aliceUserId);
        assertThat(bobMember.getDisplayName()).isEqualTo("Alice");
        assertThat(syncChangeRepository.findAll())
                .extracting(change -> change.getOwnerUserId())
                .containsExactlyInAnyOrder(aliceUserId, bobUserId);
    }

    @Test
    void acceptanceCanCreateTargetMemberWithCustomDisplayName() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                "Ali",
                false
        );

        Member requesterMember = memberRepository
                .findById(request.memberId())
                .orElseThrow();

        Member targetMember = memberRepository
                .findByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
                        bobUserId,
                        aliceUserId
                )
                .orElseThrow();

        assertThat(requesterMember.getDisplayName()).isEqualTo("Bobby");
        assertThat(requesterMember.getLinkedUserId()).isEqualTo(bobUserId);
        assertThat(targetMember.getDisplayName()).isEqualTo("Ali");
    }

    @Test
    void acceptanceCanCreateTargetMemberUsingRequesterProfileName() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );

        Member targetMember = memberRepository
                .findByOwnerUserIdAndLinkedUserIdAndDeletedAtIsNull(
                        bobUserId,
                        aliceUserId
                )
                .orElseThrow();

        assertThat(targetMember.getDisplayName()).isEqualTo("Alice");
    }

    @Test
    void historicalDebtRemainsPrivateAndAttachedToOriginalMemberAfterLinking() {
        UUID aliceMemberId = UUID.randomUUID();

        memberService.create(
                aliceUserId,
                aliceMemberId,
                "Bob",
                Instant.now()
        );

        UUID debtId = UUID.randomUUID();
        debtService.create(
                aliceUserId,
                debtId,
                aliceMemberId,
                "they_owe",
                new BigDecimal("125.00"),
                "SEK",
                "Historical debt",
                null,
                Instant.now()
        );

        syncChangeRepository.deleteAll();

        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                aliceMemberId,
                null,
                false
        );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );

        var debt = debtRepository.findById(debtId).orElseThrow();

        assertThat(debt.getOwnerUserId()).isEqualTo(aliceUserId);
        assertThat(debt.getMemberId()).isEqualTo(aliceMemberId);
        assertThat(debtRepository.count()).isEqualTo(1);
        assertThat(syncChangeRepository.findAll())
                .hasSize(2)
                .allSatisfy(change ->
                        assertThat(change.getEntityType())
                                .isEqualTo("member")
                );
    }

    @Test
    void failedAcceptanceRollsBackRequesterLink() {
        UUID aliceMemberId = UUID.randomUUID();

        memberService.create(
                aliceUserId,
                aliceMemberId,
                "Bob",
                Instant.now()
        );
        syncChangeRepository.deleteAll();

        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                aliceMemberId,
                null,
                false
        );

        assertThatThrownBy(() ->
                memberLinkingService.acceptRequest(
                        bobUserId,
                        request.id(),
                        UUID.randomUUID(),
                        null,
                        false
                )
        )
                .isInstanceOf(MemberLinkingException.class);

        assertThat(
                memberRepository.findById(aliceMemberId)
                        .orElseThrow()
                        .getLinkedUserId()
        ).isNull();

        assertThat(syncChangeRepository.count()).isZero();
        assertThat(
                requestRepository.findById(request.id())
                        .orElseThrow()
                        .getStatus()
        ).isEqualTo("pending");
    }

    @Test
    void targetCanDisableIncomingRequests() {
        memberLinkingService.updatePreferences(
                bobUserId,
                false
        );

        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        bobUserId,
                        null,
                        "Bobby",
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason
                                                .TARGET_NOT_ACCEPTING_REQUESTS
                                )
                );
    }

    @Test
    void preventsSelfLinkingAndDuplicateRelationships() {
        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        aliceUserId,
                        null,
                        "Self",
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason.SELF_LINK
                                )
                );

        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        bobUserId,
                        aliceUserId,
                        null,
                        "Alice",
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason
                                                .REQUEST_ALREADY_PENDING
                                )
                );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );

        assertThatThrownBy(() ->
                memberLinkingService.createRequest(
                        aliceUserId,
                        bobUserId,
                        null,
                        "Another Bob",
                        false
                )
        )
                .isInstanceOfSatisfying(
                        MemberLinkingException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        MemberLinkingException.Reason
                                                .RELATIONSHIP_ALREADY_EXISTS
                                )
                );
    }

    @Test
    void unlinkClearsBothLinksWithoutDeletingMembersOrDebts() {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        UUID aliceMemberId = request.memberId();

        UUID debtId = UUID.randomUUID();
        debtService.create(
                aliceUserId,
                debtId,
                aliceMemberId,
                "they_owe",
                new BigDecimal("50.00"),
                "SEK",
                "Coffee",
                null,
                Instant.now()
        );

        memberLinkingService.acceptRequest(
                bobUserId,
                request.id(),
                null,
                null,
                true
        );

        MemberLinkRequest accepted = requestRepository
                .findById(request.id())
                .orElseThrow();
        UUID bobMemberId = accepted.getTargetMemberId();

        syncChangeRepository.deleteAll();

        memberLinkingService.unlink(
                aliceUserId,
                aliceMemberId
        );

        assertThat(
                memberRepository.findById(aliceMemberId)
                        .orElseThrow()
                        .getLinkedUserId()
        ).isNull();
        assertThat(
                memberRepository.findById(bobMemberId)
                        .orElseThrow()
                        .getLinkedUserId()
        ).isNull();
        assertThat(debtRepository.findById(debtId)).isPresent();
        assertThat(
                requestRepository.findById(request.id())
                        .orElseThrow()
                        .getStatus()
        ).isEqualTo("unlinked");
        assertThat(syncChangeRepository.findAll())
                .extracting(change -> change.getOwnerUserId())
                .containsExactlyInAnyOrder(aliceUserId, bobUserId);
    }

    private UUID createUser(
            String email,
            String displayName
    ) {
        UUID userId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id, email) values (?, ?)",
                userId,
                email
        );

        profileService.update(
                userId,
                displayName,
                "SEK"
        );

        return userId;
    }
}
