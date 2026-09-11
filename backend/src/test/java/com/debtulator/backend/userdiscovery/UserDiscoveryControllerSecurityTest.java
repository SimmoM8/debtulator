package com.debtulator.backend.userdiscovery;

import com.debtulator.backend.config.TestDatabaseConfiguration;
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

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class UserDiscoveryControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ProfileService profileService;

    private UUID requesterUserId;
    private UUID targetUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.user_discovery_rate_limits");
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        requesterUserId = createUser(
                "requester@example.com",
                "Requester"
        );
        targetUserId = createUser(
                "ben@example.com",
                "Benjamin"
        );

        profileService.updateDiscoveryPreferences(
                targetUserId,
                true,
                true,
                true
        );
    }

    @Test
    void discoveryRequiresAuthentication() throws Exception {
        mockMvc.perform(
                        get("/api/v1/user-discovery/users")
                                .queryParam("query", "Benjamin")
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedDisplayNameSearchReturnsMinimalNoStoreResponse()
            throws Exception {
        mockMvc.perform(
                        get("/api/v1/user-discovery/users")
                                .queryParam("query", "ben")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(requesterUserId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")
                ))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(targetUserId.toString()))
                .andExpect(jsonPath("$[0].displayName").value("Benjamin"))
                .andExpect(jsonPath("$[0].detail").value("Debtulator user"))
                .andExpect(jsonPath("$[0].email").doesNotExist());
    }

    @Test
    void exactEmailSearchReturnsOnlyTheEmailAlreadySuppliedByRequester()
            throws Exception {
        mockMvc.perform(
                        get("/api/v1/user-discovery/users")
                                .queryParam("query", "BEN@example.com")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(requesterUserId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(targetUserId.toString()))
                .andExpect(jsonPath("$[0].detail").value("ben@example.com"));
    }

    @Test
    void invalidDisplayNameQueryReturnsStableProblemCode()
            throws Exception {
        mockMvc.perform(
                        get("/api/v1/user-discovery/users")
                                .queryParam("query", "be")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(requesterUserId.toString())
                                ))
                )
                .andExpect(status().isBadRequest())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")
                ))
                .andExpect(jsonPath("$.code")
                        .value("USER_DISCOVERY_INVALID_QUERY"));
    }

    private UUID createUser(
            String email,
            String displayName
    ) {
        UUID userId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id, email) values (?, ?)",
                userId,
                email
        );

        profileService.update(
                userId,
                displayName,
                "SEK"
        );

        return userId;
    }
}
