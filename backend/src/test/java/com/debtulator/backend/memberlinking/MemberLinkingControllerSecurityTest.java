package com.debtulator.backend.memberlinking;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.profiles.ProfileService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class MemberLinkingControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberLinkingService memberLinkingService;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID aliceUserId;
    private UUID bobUserId;
    private UUID charlieUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.member_link_requests");
        jdbcTemplate.update("delete from public.user_discovery_rate_limits");
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        aliceUserId = createUser("alice@example.com", "Alice");
        bobUserId = createUser("bob@example.com", "Bob");
        charlieUserId = createUser("charlie@example.com", "Charlie");
    }

    @Test
    void memberLinkingRequiresAuthentication() throws Exception {
        mockMvc.perform(
                        get("/api/v1/member-linking/requests/incoming")
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void directRequestCreatesPendingUnlinkedMemberAndReturnsItsId()
            throws Exception {
        mockMvc.perform(
                        post("/api/v1/member-linking/requests")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(aliceUserId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "targetUserId": "%s",
                                          "memberId": null,
                                          "displayName": "Bobby",
                                          "useTargetFullName": false
                                        }
                                        """.formatted(bobUserId))
                )
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")
                ))
                .andExpect(jsonPath("$.direction").value("outgoing"))
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.userId").value(bobUserId.toString()))
                .andExpect(jsonPath("$.memberId").isString());

        mockMvc.perform(
                        get("/api/v1/member-linking/requests/incoming")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(bobUserId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].direction").value("incoming"))
                .andExpect(jsonPath("$[0].userId")
                        .value(aliceUserId.toString()));
    }

    @Test
    void invalidDirectNamingChoiceReturnsStableError() throws Exception {
        mockMvc.perform(
                        post("/api/v1/member-linking/requests")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(aliceUserId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "targetUserId": "%s",
                                          "memberId": null,
                                          "displayName": null,
                                          "useTargetFullName": false
                                        }
                                        """.formatted(bobUserId))
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code")
                        .value("MEMBER_LINK_INVALID_NAME_SELECTION"));
    }

    @Test
    void unrelatedUserCannotAcceptRequest() throws Exception {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        mockMvc.perform(
                        post(
                                "/api/v1/member-linking/requests/{requestId}/accept",
                                request.id()
                        )
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(charlieUserId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "memberId": null,
                                          "displayName": "Alice",
                                          "useRequesterFullName": false
                                        }
                                        """)
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code")
                        .value("MEMBER_LINK_REQUEST_NOT_FOUND"));
    }

    @Test
    void targetCanAcceptAndUseRequesterProfileName() throws Exception {
        var request = memberLinkingService.createRequest(
                aliceUserId,
                bobUserId,
                null,
                "Bobby",
                false
        );

        mockMvc.perform(
                        post(
                                "/api/v1/member-linking/requests/{requestId}/accept",
                                request.id()
                        )
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(bobUserId.toString())
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "memberId": null,
                                          "displayName": null,
                                          "useRequesterFullName": true
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"))
                .andExpect(jsonPath("$.direction").value("incoming"))
                .andExpect(jsonPath("$.memberId").isString());
    }

    @Test
    void preferenceEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(
                        get("/api/v1/member-linking/preferences")
                )
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                        get("/api/v1/member-linking/preferences")
                                .with(jwt().jwt(jwt ->
                                        jwt.subject(aliceUserId.toString())
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incomingMemberLinkRequestsEnabled")
                        .value(true));
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
