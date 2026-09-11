package com.debtulator.backend.profiles;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class ProfileServiceIntegrationTest {
    @Autowired private ProfileService profileService;
    @Autowired private JdbcTemplate jdbcTemplate;
    private UUID userId;

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

        userId = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id) values (?)", userId);
    }

    @Test
    void accountNameAllowsOneOrMoreNames() {
        assertThat(profileService.update(userId, "  Ben  ", "SEK").getName())
                .isEqualTo("Ben");
        assertThat(profileService.update(userId, "Benjamin Simmons", "SEK").getName())
                .isEqualTo("Benjamin Simmons");
    }

    @Test
    void blankNameIsRejectedButNullCanRemainUnset() {
        assertThat(profileService.update(userId, null, "SEK").getName()).isNull();

        assertThatThrownBy(() ->
                profileService.update(userId, "   ", "SEK")
        )
                .isInstanceOfSatisfying(
                        ProfileServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(ProfileServiceException.Reason.INVALID_NAME)
                );
    }
}
