package com.debtulator.backend.userdiscovery;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.profiles.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class UserDiscoveryServiceIntegrationTest {
    @Autowired private UserDiscoveryService userDiscoveryService;
    @Autowired private ProfileService profileService;
    @Autowired private JdbcTemplate jdbcTemplate;
    private UUID requesterUserId;

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
        requesterUserId = createUser("requester@example.com", "Requester");
    }

    @Test
    void partialNameSearchUsesAccountName() {
        UUID targetId = createUser("ben@example.com", "Benjamin");
        profileService.updateDiscoveryPreferences(targetId, true, true, false);

        var results = userDiscoveryService.search(requesterUserId, "jam");

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().id()).isEqualTo(targetId);
        assertThat(results.getFirst().name()).isEqualTo("Benjamin");
    }

    private UUID createUser(String email, String name) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id, email) values (?, ?)", id, email);
        profileService.update(id, name, "SEK");
        return id;
    }
}
