package com.debtulator.backend.userdiscovery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.profiles.ProfileService;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class UserDiscoveryServiceIntegrationTest {

        @Autowired
        private UserDiscoveryService userDiscoveryService;

        @Autowired
        private ProfileService profileService;

        @Autowired
        private JdbcTemplate jdbcTemplate;

        private UUID requesterUserId;

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
                                "Requester");
        }

        @Test
        void profilesArePrivateByDefault() {
                UUID targetUserId = createUser(
                                "target@example.com",
                                "Benjamin");

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "Benjamin"))
                                .isEmpty();

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                targetUserId.toString()))
                                .isEmpty();

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "target@example.com"))
                                .isEmpty();
        }

        @Test
        void displayNameSearchIsPartialCaseInsensitiveAndMinimal() {
                UUID targetUserId = createDiscoverableUser(
                                "ben@example.com",
                                "Benjamin Simmons",
                                true,
                                false);

                var results = userDiscoveryService.search(
                                requesterUserId,
                                "JAMin");

                assertThat(results).hasSize(1);
                assertThat(results.getFirst().id()).isEqualTo(targetUserId);
                assertThat(results.getFirst().displayName())
                                .isEqualTo("Benjamin Simmons");
                assertThat(results.getFirst().detail())
                                .isEqualTo("Debtulator user");
        }

        @Test
        void displayNameSearchTreatsWildcardCharactersLiterally() {
                UUID targetUserId = createDiscoverableUser(
                                "percent@example.com",
                                "100% Real",
                                true,
                                false);

                var results = userDiscoveryService.search(
                                requesterUserId,
                                "100%");

                assertThat(results)
                                .extracting(result -> result.id())
                                .containsExactly(targetUserId);
        }

        @Test
        void exactEmailSearchRequiresExplicitEmailDiscoverability() {
                UUID targetUserId = createDiscoverableUser(
                                "Target@Example.com",
                                "Target User",
                                true,
                                true);

                var exact = userDiscoveryService.search(
                                requesterUserId,
                                "target@example.com");
                var partial = userDiscoveryService.search(
                                requesterUserId,
                                "target@");

                assertThat(exact).hasSize(1);
                assertThat(exact.getFirst().id()).isEqualTo(targetUserId);
                assertThat(exact.getFirst().displayName()).isEqualTo("Target User");
                assertThat(exact.getFirst().detail()).isEqualTo("target@example.com");
                assertThat(partial).isEmpty();
        }

        @Test
        void exactEmailSearchDoesNotLeakEmailWhenEmailDiscoveryIsDisabled() {
                createDiscoverableUser(
                                "private@example.com",
                                "Private User",
                                true,
                                false);

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "private@example.com"))
                                .isEmpty();

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "Private"))
                                .hasSize(1);
        }

        @Test
        void exactUserIdLookupRequiresOnlyMasterDiscoveryConsent() {
                UUID targetUserId = createDiscoverableUser(
                                "id@example.com",
                                "ID User",
                                false,
                                false);

                var results = userDiscoveryService.search(
                                requesterUserId,
                                targetUserId.toString());

                assertThat(results).hasSize(1);
                assertThat(results.getFirst().id()).isEqualTo(targetUserId);
                assertThat(results.getFirst().detail())
                                .isEqualTo("Debtulator user");
        }

        @Test
        void excludesRequesterFromResults() {
                profileService.updateDiscoveryPreferences(
                                requesterUserId,
                                true,
                                true,
                                true);

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "Requester"))
                                .isEmpty();

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                "requester@example.com"))
                                .isEmpty();

                assertThat(
                                userDiscoveryService.search(
                                                requesterUserId,
                                                requesterUserId.toString()))
                                .isEmpty();
        }

        @Test
        void displayNameSearchHasFixedResultCap() {
                for (int index = 0; index < 12; index++) {
                        createDiscoverableUser(
                                        "search" + index + "@example.com",
                                        "Search Person " + index,
                                        true,
                                        false);
                }

                var results = userDiscoveryService.search(
                                requesterUserId,
                                "Search");

                assertThat(results).hasSize(UserDiscoveryService.MAX_RESULTS);
        }

        @Test
        void shortDisplayNameSearchIsRejected() {
                assertThatThrownBy(() -> userDiscoveryService.search(
                                requesterUserId,
                                "Be"))
                                .isInstanceOfSatisfying(
                                                UserDiscoveryException.class,
                                                exception -> assertThat(exception.getReason())
                                                                .isEqualTo(
                                                                                UserDiscoveryException.Reason.INVALID_QUERY));
        }

        @Test
        void rateLimitsAuthenticatedRequesterAcrossSearchTypes() {
                for (int index = 0; index < UserDiscoveryService.MAX_REQUESTS_PER_WINDOW; index++) {
                        userDiscoveryService.search(
                                        requesterUserId,
                                        "Nobody");
                }

                assertThatThrownBy(() -> userDiscoveryService.search(
                                requesterUserId,
                                "Nobody"))
                                .isInstanceOfSatisfying(
                                                UserDiscoveryException.class,
                                                exception -> {
                                                        assertThat(exception.getReason())
                                                                        .isEqualTo(
                                                                                        UserDiscoveryException.Reason.RATE_LIMITED);
                                                        assertThat(exception.getRetryAfterSeconds())
                                                                        .isBetween(1L, 60L);
                                                });

                Integer count = jdbcTemplate.queryForObject(
                                """
                                                select request_count
                                                from public.user_discovery_rate_limits
                                                where user_id = ?
                                                """,
                                Integer.class,
                                requesterUserId);

                assertThat(count)
                                .isEqualTo(UserDiscoveryService.MAX_REQUESTS_PER_WINDOW + 1);
        }

        private UUID createDiscoverableUser(
                        String email,
                        String displayName,
                        boolean discoverableByDisplayName,
                        boolean discoverableByEmail) {
                UUID userId = createUser(email, displayName);

                profileService.updateDiscoveryPreferences(
                                userId,
                                true,
                                discoverableByDisplayName,
                                discoverableByEmail);

                return userId;
        }

        private UUID createUser(
                        String email,
                        String displayName) {
                UUID userId = UUID.randomUUID();

                jdbcTemplate.update(
                                "insert into auth.users (id, email) values (?, ?)",
                                userId,
                                email);

                profileService.update(
                                userId,
                                displayName,
                                "SEK");

                return userId;
        }
}
