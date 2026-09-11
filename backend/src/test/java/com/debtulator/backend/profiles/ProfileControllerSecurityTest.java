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
class ProfileControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID userId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        userId = UUID.randomUUID();
        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                userId
        );
    }

    @Test
    void profileRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code")
                        .value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void authenticatedUserCanReadOwnProfile() throws Exception {
        mockMvc.perform(
                        get("/api/v1/profile")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")
                ))
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.displayName").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.baseCurrency").value("SEK"))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.updatedAt").isString());
    }

    @Test
    void authenticatedUserCanUpdateOwnProfile() throws Exception {
        mockMvc.perform(
                        put("/api/v1/profile")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "displayName": "Benjamin",
                                          "baseCurrency": "EUR"
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.displayName").value("Benjamin"))
                .andExpect(jsonPath("$.baseCurrency").value("EUR"));
    }

    @Test
    void unsupportedCurrencyReturnsProfileError() throws Exception {
        mockMvc.perform(
                        put("/api/v1/profile")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "displayName": "Benjamin",
                                          "baseCurrency": "ZZZ"
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code")
                        .value("PROFILE_CURRENCY_NOT_SUPPORTED"));
    }

    @Test
    void invalidCurrencyShapeFailsRequestValidation() throws Exception {
        mockMvc.perform(
                        put("/api/v1/profile")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(userId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "displayName": "Benjamin",
                                          "baseCurrency": "EURO"
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.baseCurrency").exists());
    }
}
