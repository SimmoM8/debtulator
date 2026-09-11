package com.debtulator.backend.agreements;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.debts.Debt;
import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.debts.DebtService;
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

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class AgreementServiceIntegrationTest {
    @Autowired private AgreementService agreementService;
    @Autowired private DebtService debtService;
    @Autowired private DebtRepository debtRepository;
    @Autowired private MemberService memberService;
    @Autowired private ProfileService profileService;
    @Autowired private SyncChangeRepository syncChangeRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID aliceUserId;
    private UUID bobUserId;
    private UUID aliceBobMemberId;

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

        aliceBobMemberId = UUID.randomUUID();
        memberService.createLinked(
                aliceUserId,
                aliceBobMemberId,
                "Bob",
                bobUserId
        );
        memberService.createLinked(
                bobUserId,
                UUID.randomUUID(),
                "Alice",
                aliceUserId
        );

        syncChangeRepository.deleteAll();
    }

    @Test
    void linkedDebtIsPrivateImmediatelyAndPendingUntilAccepted() {
        UUID debtId = UUID.randomUUID();

        Debt debt = debtService.create(
                aliceUserId,
                debtId,
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("100.00"),
                "SEK",
                "Dinner",
                null,
                Instant.now()
        );

        assertThat(
                agreementService.getStates(aliceUserId).getFirst().status()
        ).isEqualTo("pending");

        var incoming = agreementService.getIncoming(bobUserId);
        assertThat(incoming).hasSize(1);
        assertThat(incoming.getFirst().action()).isEqualTo("create");
        assertThat(incoming.getFirst().payload())
                .containsEntry("amount", "100");

        Long privateVersionBeforeApproval = debt.getVersion();

        agreementService.accept(
                bobUserId,
                incoming.getFirst().id()
        );

        Debt agreed = debtRepository.findById(debtId).orElseThrow();
        assertThat(agreed.getVersion()).isEqualTo(privateVersionBeforeApproval);
        assertThat(agreed.getAmount()).isEqualByComparingTo("100.00");
        assertThat(
                agreementService.getStates(aliceUserId).getFirst().status()
        ).isEqualTo("agreed");
        assertThat(agreementService.getAgreed(bobUserId))
                .extracting(response -> response.id())
                .contains(incoming.getFirst().id());
    }

    @Test
    void rejectionDoesNotUndoPrivateDebtChange() {
        Debt debt = debtService.create(
                aliceUserId,
                UUID.randomUUID(),
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("100.00"),
                "SEK",
                "Dinner",
                null,
                Instant.now()
        );
        agreementService.accept(
                bobUserId,
                agreementService.getIncoming(bobUserId).getFirst().id()
        );

        Debt current = debtRepository.findById(debt.getId()).orElseThrow();
        Debt edited = debtService.update(
                aliceUserId,
                current.getId(),
                current.getVersion(),
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("125.00"),
                "SEK",
                "Dinner corrected",
                null
        );

        assertThat(edited.getAmount()).isEqualByComparingTo("125.00");
        assertThat(
                agreementService.getStates(aliceUserId).getFirst().status()
        ).isEqualTo("pending");

        UUID requestId = agreementService.getIncoming(bobUserId).getFirst().id();
        agreementService.reject(bobUserId, requestId);

        Debt rejected = debtRepository.findById(debt.getId()).orElseThrow();
        assertThat(rejected.getAmount()).isEqualByComparingTo("125.00");
        assertThat(rejected.getTitle()).isEqualTo("Dinner corrected");
        assertThat(
                agreementService.getStates(aliceUserId).getFirst().status()
        ).isEqualTo("rejected");
    }

    @Test
    void furtherPrivateEditsSupersedePendingProposalInsteadOfBlockingUser() {
        Debt debt = debtService.create(
                aliceUserId,
                UUID.randomUUID(),
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("10.00"),
                "SEK",
                "Taxi",
                null,
                Instant.now()
        );

        UUID firstRequestId = agreementService
                .getIncoming(bobUserId)
                .getFirst()
                .id();

        Debt current = debtRepository.findById(debt.getId()).orElseThrow();
        debtService.update(
                aliceUserId,
                current.getId(),
                current.getVersion(),
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("11.00"),
                "SEK",
                "Taxi",
                null
        );

        var currentIncoming = agreementService.getIncoming(bobUserId);
        assertThat(currentIncoming).hasSize(1);
        assertThat(currentIncoming.getFirst().id())
                .isNotEqualTo(firstRequestId);
        assertThat(currentIncoming.getFirst().payload())
                .containsEntry("amount", "11");

        String oldStatus = jdbcTemplate.queryForObject(
                "select status from public.agreement_requests where id = ?",
                String.class,
                firstRequestId
        );
        assertThat(oldStatus).isEqualTo("superseded");
    }

    @Test
    void unlinkedDebtRemainsPrivateAndCreatesNoAgreementRequest() {
        UUID unlinkedMemberId = UUID.randomUUID();
        memberService.create(
                aliceUserId,
                unlinkedMemberId,
                "Charlie",
                Instant.now()
        );

        Debt debt = debtService.create(
                aliceUserId,
                UUID.randomUUID(),
                unlinkedMemberId,
                "you_owe",
                new BigDecimal("20.00"),
                "SEK",
                "Private note",
                null,
                Instant.now()
        );

        assertThat(
                agreementService.getStates(aliceUserId).getFirst().status()
        ).isEqualTo("private");
        assertThat(agreementService.getIncoming(bobUserId)).isEmpty();
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
