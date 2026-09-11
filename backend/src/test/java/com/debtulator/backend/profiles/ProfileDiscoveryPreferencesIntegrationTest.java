package com.debtulator.backend.profiles;

import com.debtulator.backend.config.TestDatabaseConfiguration;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ProfileDiscoveryPreferencesIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ProfileRepository profileRepository;
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
        jdbcTemplate.update(
                "insert into auth.users (id, email) values (?, ?)",
                userId,
                "ben@example.com"
        );
    }

    @Test
    void nameAndDiscoveryTerminologyIsConsistent() throws Exception {
        mockMvc.perform(
                        put("/api/v1/profile")
                                .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "name": "Ben",
                                          "baseCurrency": "SEK"
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ben"));

        mockMvc.perform(
                        put("/api/v1/profile/discovery-preferences")
                                .with(jwt().jwt(jwt -> jwt.subject(userId.toString())))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "memberDiscoveryEnabled": true,
                                          "discoverableByName": false,
                                          "discoverableByEmail": true
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.discoverableByName").value(false));

        Profile profile = profileRepository.findById(userId).orElseThrow();
        assertThat(profile.getName()).isEqualTo("Ben");
        assertThat(profile.isDiscoverableByName()).isFalse();
    }
}
