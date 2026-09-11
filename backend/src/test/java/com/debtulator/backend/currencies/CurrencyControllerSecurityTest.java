package com.debtulator.backend.currencies;

import com.debtulator.backend.config.TestDatabaseConfiguration;
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
class CurrencyControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update(
                "update public.currencies set enabled = true"
        );
    }

    @Test
    void currenciesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/currencies"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsOnlyEnabledCurrenciesInConfiguredOrder() throws Exception {
        jdbcTemplate.update(
                "update public.currencies set enabled = false where code = 'GBP'"
        );

        mockMvc.perform(
                        get("/api/v1/currencies")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(UUID.randomUUID().toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-cache")
                ))
                .andExpect(jsonPath("$[0].code").value("AUD"))
                .andExpect(jsonPath("$[1].code").value("EUR"))
                .andExpect(jsonPath("$[2].code").value("SEK"))
                .andExpect(jsonPath("$[3].code").value("USD"))
                .andExpect(jsonPath("$[3].decimalPlaces").value(2))
                .andExpect(jsonPath("$[3].displayOrder").value(50))
                .andExpect(jsonPath("$.length()").value(4));
    }
}
