package com.debtulator.backend.sync;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
@SpringBootTest
class SyncControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rejectsUnauthenticatedSyncRequest() throws Exception {
        mockMvc.perform(get("/api/v1/sync/bootstrap"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    @Test
    void acceptsAuthenticatedSyncRequest() throws Exception {
        mockMvc.perform(
                        get("/api/v1/sync/bootstrap")
                                .with(jwt().jwt(token ->
                                        token.subject(UUID.randomUUID().toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityTypes[0]").value("member"))
                .andExpect(jsonPath("$.entityTypes[1]").value("debt"));
    }
}
