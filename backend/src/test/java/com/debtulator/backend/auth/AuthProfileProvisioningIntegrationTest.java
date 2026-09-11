package com.debtulator.backend.auth;

import com.debtulator.backend.config.TestDatabaseConfiguration;
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
class AuthProfileProvisioningIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsProfileWhenAuthUserIsCreated() {
        UUID userId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                userId
        );

        var profile = jdbcTemplate.queryForMap(
                "select user_id, base_currency from public.profiles where user_id = ?",
                userId
        );

        assertThat(profile.get("user_id")).isEqualTo(userId);
        assertThat(profile.get("base_currency")).isEqualTo("SEK");
    }
}
