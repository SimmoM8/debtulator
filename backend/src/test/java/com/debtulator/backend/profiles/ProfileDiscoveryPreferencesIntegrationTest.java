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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class ProfileDiscoveryPreferencesIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID userId;

    @BeforeEach
    void setUp() {
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
    void discoveryPreferencesArePrivacySafeByDefault() {
        Profile profile = profileRepository.findById(userId).orElseThrow();

        assertThat(profile.isMemberDiscoveryEnabled()).isFalse();
        assertThat(profile.isDiscoverableByDisplayName()).isTrue();
        assertThat(profile.isDiscoverableByEmail()).isFalse();
    }

    @Test
    void authenticatedUserCanReadAndUpdateOwnDiscoveryPreferences()
            throws Exception {
        mockMvc.perform(
                        get("/api/v1/profile/discovery-preferences")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")
                ))
                .andExpect(jsonPath("$.memberDiscoveryEnabled").value(false))
                .andExpect(jsonPath("$.discoverableByDisplayName").value(true))
                .andExpect(jsonPath("$.discoverableByEmail").value(false));

        mockMvc.perform(
                        put("/api/v1/profile/discovery-preferences")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "memberDiscoveryEnabled": true,
                                          "discoverableByDisplayName": false,
                                          "discoverableByEmail": true
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberDiscoveryEnabled").value(true))
                .andExpect(jsonPath("$.discoverableByDisplayName").value(false))
                .andExpect(jsonPath("$.discoverableByEmail").value(true));

        Profile persisted = profileRepository.findById(userId).orElseThrow();
        assertThat(persisted.isMemberDiscoveryEnabled()).isTrue();
        assertThat(persisted.isDiscoverableByDisplayName()).isFalse();
        assertThat(persisted.isDiscoverableByEmail()).isTrue();
    }

    @Test
    void discoveryPreferencesRequireAuthentication() throws Exception {
        mockMvc.perform(
                        get("/api/v1/profile/discovery-preferences")
                )
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        put("/api/v1/profile/discovery-preferences")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "memberDiscoveryEnabled": true,
                                          "discoverableByDisplayName": true,
                                          "discoverableByEmail": false
                                        }
                                        """)
                )
                .andExpect(status().isUnauthorized());
    }
}
