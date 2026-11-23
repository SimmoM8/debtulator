package com.debtulator.backend.collaboration;

import com.debtulator.backend.agreements.AgreementService;
import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.debts.DebtService;
import com.debtulator.backend.members.MemberRepository;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.profiles.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class TwoPersonCollaborationJourneyIntegrationTest {
    @Autowired private MemberService members;
    @Autowired private MemberRepository memberRepository;
    @Autowired private AgreementService agreements;
    @Autowired private DebtService debts;
    @Autowired private ProfileService profiles;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private MockMvc mockMvc;

    private UUID alice;
    private UUID bob;
    private UUID aliceMember;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from public.agreement_entity_states");
        jdbc.update("delete from public.agreement_requests");
        jdbc.update("delete from public.member_link_requests");
        jdbc.update("delete from public.user_discovery_rate_limits");
        jdbc.update("delete from public.sync_mutations");
        jdbc.update("delete from public.sync_changes");
        jdbc.update("delete from public.debt_collaborations");
        jdbc.update("delete from public.debts");
        jdbc.update("delete from public.members");
        jdbc.update("delete from auth.users");

        alice = user("alice-journey@example.com", "Alice");
        bob = user("bob-journey@example.com", "Bob");
        aliceMember = UUID.randomUUID();
        members.create(alice, aliceMember, "Bob (my ledger)", Instant.now());
    }

    @Test
    void linkRejectionThenAcceptancePreservesPrivateHistoryAndDebtDecisions() throws Exception {
        UUID historicalDebt = UUID.randomUUID();
        debts.create(alice, historicalDebt, aliceMember, "they_owe",
                new BigDecimal("15.00"), "SEK", "Prior private record", null, Instant.now());

        UUID declinedLinkId = UUID.randomUUID();
        createLinkOverHttp(declinedLinkId);
        mockMvc.perform(get("/api/v1/inbox/requests")
                        .param("scope", "needs_action")
                        .param("type", "member_link")
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(declinedLinkId.toString()));
        assertThat(memberRepository.findById(aliceMember).orElseThrow().getLinkedUserId()).isNull();
        mockMvc.perform(post("/api/v1/member-linking/requests/{id}/reject", declinedLinkId)
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
        assertThat(memberRepository.findById(aliceMember).orElseThrow().getLinkedUserId()).isNull();
        assertThat(jdbc.queryForObject("select count(*) from public.debts where id = ?",
                Integer.class, historicalDebt)).isEqualTo(1);

        UUID acceptedLinkId = UUID.randomUUID();
        createLinkOverHttp(acceptedLinkId);
        mockMvc.perform(post("/api/v1/member-linking/requests/{id}/accept", acceptedLinkId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"useRequesterName\":true}")
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));
        assertThat(memberRepository.findById(aliceMember).orElseThrow().getLinkedUserId()).isEqualTo(bob);
        assertThat(jdbc.queryForObject(
                "select count(*) from public.members where owner_user_id = ? and linked_user_id = ?",
                Integer.class, bob, alice)).isEqualTo(1);

        // Linking does not retroactively expose the private historical debt.
        assertThat(agreements.getIncoming(bob)).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from public.debt_collaborations",
                Integer.class)).isZero();

        UUID rejectedDebt = UUID.randomUUID();
        createDebtOverSync(rejectedDebt, "they_owe", "125.50", "Rejected dinner");
        var rejectedProposal = agreements.getIncoming(bob).getFirst();
        mockMvc.perform(get("/api/v1/inbox/requests")
                        .param("scope", "needs_action")
                        .param("type", "debt")
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(rejectedProposal.id().toString()));
        mockMvc.perform(post("/api/v1/agreements/requests/{id}/reject", rejectedProposal.id())
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
        assertThat(jdbc.queryForObject(
                "select amount from public.debts where id = ?", BigDecimal.class, rejectedDebt))
                .isEqualByComparingTo("125.50");
        assertThat(agreements.getIncoming(bob)).isEmpty();
        assertThat(agreements.getStates(alice).stream()
                .filter(s -> s.entityId().equals(rejectedDebt)).findFirst().orElseThrow().status())
                .isEqualTo("disagreed");

        UUID agreedDebt = UUID.randomUUID();
        createDebtOverSync(agreedDebt, "you_owe", "42.00", "Shared taxi");
        var agreedProposal = agreements.getIncoming(bob).getFirst();
        mockMvc.perform(post("/api/v1/agreements/requests/{id}/accept", agreedProposal.id())
                        .with(jwt().jwt(token -> token.subject(bob.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));
        assertThat(agreements.getIncoming(bob)).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from public.debt_collaborations",
                Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from public.debts where owner_user_id = ? and direction = 'they_owe' and amount = 42.00",
                Integer.class, bob)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from public.debts where owner_user_id = ?",
                Integer.class, alice)).isEqualTo(3);
    }

    private void createLinkOverHttp(UUID id) throws Exception {
        String body = String.format(
                "{\"requestId\":\"%s\",\"targetUserId\":\"%s\",\"memberId\":\"%s\",\"useTargetName\":false}",
                id, bob, aliceMember);
        mockMvc.perform(post("/api/v1/member-linking/requests")
                        .with(jwt().jwt(token -> token.subject(alice.toString())))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"));
    }

    private void createDebtOverSync(UUID id, String direction, String amount, String title)
            throws Exception {
        String body = String.format(
                "{\"mutations\":[{\"id\":\"%s\",\"entityType\":\"debt\",\"entityId\":\"%s\",\"operation\":\"upsert\",\"payload\":{\"memberId\":\"%s\",\"direction\":\"%s\",\"amount\":\"%s\",\"currency\":\"SEK\",\"title\":\"%s\",\"dueDate\":null,\"createdAt\":\"%s\"}}]}",
                UUID.randomUUID(), id, aliceMember, direction, amount, title, Instant.now());
        mockMvc.perform(post("/api/v1/sync/mutations")
                        .with(jwt().jwt(token -> token.subject(alice.toString())))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].status").value("applied"));
    }

    private UUID user(String email, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into auth.users (id, email) values (?, ?)", id, email);
        profiles.update(id, null, name, null, "SEK");
        return id;
    }
}
