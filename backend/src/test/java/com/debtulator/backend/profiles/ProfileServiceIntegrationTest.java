package com.debtulator.backend.profiles;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class ProfileServiceIntegrationTest {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private ProfileRepository profileRepository;

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
    void newAuthUserIsProvisionedWithDefaultProfile() {
        Profile profile = profileService.get(userId);

        assertThat(profile.getUserId()).isEqualTo(userId);
        assertThat(profile.getDisplayName()).isNull();
        assertThat(profile.getBaseCurrency()).isEqualTo("SEK");
        assertThat(profile.getCreatedAt()).isNotNull();
        assertThat(profile.getUpdatedAt()).isNotNull();
    }

    @Test
    void updatesEditableProfileFields() {
        Profile before = profileService.get(userId);
        Instant createdAt = before.getCreatedAt();

        Profile updated = profileService.update(
                userId,
                "  Benjamin  ",
                "usd"
        );

        assertThat(updated.getUserId()).isEqualTo(userId);
        assertThat(updated.getDisplayName()).isEqualTo("Benjamin");
        assertThat(updated.getBaseCurrency()).isEqualTo("USD");
        assertThat(updated.getCreatedAt()).isEqualTo(createdAt);
        assertThat(updated.getUpdatedAt()).isAfterOrEqualTo(before.getUpdatedAt());

        Profile persisted = profileRepository.findById(userId).orElseThrow();
        assertThat(persisted.getDisplayName()).isEqualTo("Benjamin");
        assertThat(persisted.getBaseCurrency()).isEqualTo("USD");
    }

    @Test
    void allowsDisplayNameToBeCleared() {
        profileService.update(userId, "Benjamin", "SEK");

        Profile updated = profileService.update(userId, null, "SEK");

        assertThat(updated.getDisplayName()).isNull();
    }

    @Test
    void rejectsBlankDisplayName() {
        assertThatThrownBy(() ->
                profileService.update(userId, "   ", "SEK")
        )
                .isInstanceOfSatisfying(
                        ProfileServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        ProfileServiceException.Reason.INVALID_DISPLAY_NAME
                                )
                );
    }

    @Test
    void rejectsUnsupportedCurrency() {
        assertThatThrownBy(() ->
                profileService.update(userId, "Benjamin", "ZZZ")
        )
                .isInstanceOfSatisfying(
                        ProfileServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        ProfileServiceException.Reason.CURRENCY_NOT_SUPPORTED
                                )
                );
    }

    @Test
    void cannotReadAnotherUsersProfileByUsingOwnIdentifier() {
        UUID otherUserId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                otherUserId
        );

        profileService.update(otherUserId, "Other User", "EUR");

        Profile ownProfile = profileService.get(userId);

        assertThat(ownProfile.getUserId()).isEqualTo(userId);
        assertThat(ownProfile.getDisplayName()).isNull();
        assertThat(ownProfile.getBaseCurrency()).isEqualTo("SEK");
    }
}
