package com.debtulator.backend.memberlinking;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.profiles.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class MemberLinkingControllerSecurityTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ProfileService profileService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private UUID aliceUserId;
    private UUID bobUserId;

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
    }

    @Test
    void createRequestUsesNameTerminologyAndClientRequestId() throws Exception {
        UUID requestId = UUID.randomUUID();

        mockMvc.perform(
                        post("/api/v1/member-linking/requests")
                                .with(jwt().jwt(jwt -> jwt.subject(aliceUserId.toString())))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "requestId": "%s",
                                          "targetUserId": "%s",
                                          "memberId": null,
                                          "displayName": null,
                                          "useTargetName": true
                                        }
                                        """.formatted(requestId, bobUserId))
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(requestId.toString()))
                .andExpect(jsonPath("$.name").value("Bob"))
                .andExpect(jsonPath("$.displayName").doesNotExist())
                .andExpect(jsonPath("$.memberId").isString());
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
