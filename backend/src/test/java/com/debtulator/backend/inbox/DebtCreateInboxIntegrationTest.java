package com.debtulator.backend.inbox;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.debts.DebtService;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.profiles.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class DebtCreateInboxIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private MemberService memberService;
    @Autowired private DebtService debtService;
    @Autowired private ProfileService profileService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private ObjectMapper objectMapper;

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
        jdbcTemplate.update("delete from public.debt_collaborations");
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
    }

    @Test
    void linkedDebtCreateAppearsInInboxAndCanBeReviewedAndAccepted() throws Exception {
        debtService.create(
                aliceUserId,
                UUID.randomUUID(),
                aliceBobMemberId,
                "they_owe",
                new BigDecimal("125.50"),
                "SEK",
                "Dinner",
                null,
                Instant.now()
        );

        String inboxBody = mockMvc.perform(
                        get("/api/v1/inbox/requests")
                                .param("scope", "needs_action")
                                .param("type", "debt")
                                .with(jwt().jwt(jwt -> jwt.subject(bobUserId.toString())))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("debt"))
                .andExpect(jsonPath("$[0].direction").value("incoming"))
                .andExpect(jsonPath("$[0].counterpartyName").value("Alice"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper
                .readTree(inboxBody)
                .get(0)
                .get("requestId")
                .asText();

        mockMvc.perform(
                        get("/api/v1/agreements/requests/{requestId}", requestId)
                                .with(jwt().jwt(jwt -> jwt.subject(bobUserId.toString())))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.direction").value("incoming"))
                .andExpect(jsonPath("$.entityType").value("debt"))
                .andExpect(jsonPath("$.action").value("create"))
                .andExpect(jsonPath("$.payload.title").value("Dinner"))
                .andExpect(jsonPath("$.payload.amount").value("125.5"));

        mockMvc.perform(
                        post("/api/v1/agreements/requests/{requestId}/accept", requestId)
                                .with(jwt().jwt(jwt -> jwt.subject(bobUserId.toString())))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));

        mockMvc.perform(
                        get("/api/v1/inbox/requests")
                                .param("scope", "history")
                                .param("type", "debt")
                                .with(jwt().jwt(jwt -> jwt.subject(bobUserId.toString())))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(requestId))
                .andExpect(jsonPath("$[0].status").value("accepted"));
    }

    private UUID createUser(String email, String name) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "insert into auth.users (id, email) values (?, ?)",
                id,
                email
        );
        profileService.update(id, null, name, null, "SEK");
        return id;
    }
}
