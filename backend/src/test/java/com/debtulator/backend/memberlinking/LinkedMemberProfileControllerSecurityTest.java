package com.debtulator.backend.memberlinking;

import com.debtulator.backend.config.TestDatabaseConfiguration;
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

import java.time.Instant;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class LinkedMemberProfileControllerSecurityTest {
    private static final String PATH = "/api/v1/member-linking/linked-accounts";

    @Autowired private MockMvc mockMvc;
    @Autowired private ProfileService profileService;
    @Autowired private MemberService memberService;
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
        jdbcTemplate.update("delete from public.debt_collaborations");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        aliceUserId = createUser("alice@example.com", "Alice");
        bobUserId = createUser("bob@example.com", "Bob");
        charlieUserId = createUser("charlie@example.com", "Charlie");
    }

    @Test
    void returnsOnlyActiveLinkedAccountsOwnedByCaller() throws Exception {
        UUID memberId = UUID.randomUUID();
        memberService.create(aliceUserId, memberId, "Friend", Instant.now());
        memberService.linkExisting(aliceUserId, memberId, bobUserId);
        memberService.create(aliceUserId, UUID.randomUUID(), "Unlinked", Instant.now());
        profileService.update(bobUserId, "bob_linked", "Bob", null, "SEK");

        mockMvc.perform(get(PATH).with(jwt().jwt(jwt -> jwt.subject(aliceUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].linkedUserId").value(bobUserId.toString()))
                .andExpect(jsonPath("$[0].username").value("bob_linked"))
                .andExpect(jsonPath("$[0].name").doesNotExist());

        mockMvc.perform(get(PATH).with(jwt().jwt(jwt -> jwt.subject(charlieUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
    }

    @Test
    void reflectsRenamesAndRevokesUsernameAfterUnlink() throws Exception {
        UUID memberId = UUID.randomUUID();
        memberService.create(aliceUserId, memberId, "Friend", Instant.now());
        memberService.linkExisting(aliceUserId, memberId, bobUserId);
        profileService.update(bobUserId, "bob_new", "Bob", null, "SEK");

        mockMvc.perform(get(PATH).with(jwt().jwt(jwt -> jwt.subject(aliceUserId.toString()))))
                .andExpect(jsonPath("$[0].username").value("bob_new"));

        memberService.unlinkLinked(aliceUserId, memberId, bobUserId);

        mockMvc.perform(get(PATH).with(jwt().jwt(jwt -> jwt.subject(aliceUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    private UUID createUser(String email, String name) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id, email) values (?, ?)", id, email);
        profileService.update(id, null, name, null, "SEK");
        return id;
    }
}
