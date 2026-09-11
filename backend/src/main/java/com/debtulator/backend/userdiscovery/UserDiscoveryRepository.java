package com.debtulator.backend.userdiscovery;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class UserDiscoveryRepository {

    public record DiscoveryRow(
            UUID id,
            String displayName,
            String email) {
    }

    public record RateLimitState(
            int requestCount,
            Instant windowStartedAt) {
    }

    private final JdbcTemplate jdbcTemplate;

    public List<DiscoveryRow> searchByDisplayName(
            UUID requesterUserId,
            String query,
            int limit) {
        String pattern = "%"
                + escapeLikePattern(query)
                + "%";

        return jdbcTemplate.query(
                """
                        select
                            profile.user_id,
                            profile.display_name,
                            cast(null as text) as email
                        from public.profiles profile
                        where profile.user_id <> ?
                          and profile.member_discovery_enabled = true
                          and profile.discoverable_by_display_name = true
                          and profile.display_name is not null
                          and lower(profile.display_name) like lower(?) escape '!'
                        order by
                            case
                                when lower(profile.display_name) = lower(?) then 0
                                else 1
                            end,
                            lower(profile.display_name),
                            profile.user_id
                        limit ?
                        """,
                (resultSet, rowNumber) -> new DiscoveryRow(
                        resultSet.getObject("user_id", UUID.class),
                        resultSet.getString("display_name"),
                        resultSet.getString("email")),
                requesterUserId,
                pattern,
                query,
                limit);
    }

    public Optional<DiscoveryRow> findByExactEmail(
            UUID requesterUserId,
            String email) {
        List<DiscoveryRow> rows = jdbcTemplate.query(
                """
                        select
                            profile.user_id,
                            profile.display_name,
                            account.email
                        from public.profiles profile
                        join public.user_discovery_auth_accounts account
                          on account.user_id = profile.user_id
                        where profile.user_id <> ?
                          and profile.member_discovery_enabled = true
                          and profile.discoverable_by_email = true
                          and profile.display_name is not null
                          and account.email is not null
                          and lower(account.email) = lower(?)
                        limit 1
                        """,
                (resultSet, rowNumber) -> new DiscoveryRow(
                        resultSet.getObject("user_id", UUID.class),
                        resultSet.getString("display_name"),
                        resultSet.getString("email")),
                requesterUserId,
                email);

        return rows.stream().findFirst();
    }

    public Optional<DiscoveryRow> findByExactUserId(
            UUID requesterUserId,
            UUID targetUserId) {
        List<DiscoveryRow> rows = jdbcTemplate.query(
                """
                        select
                            profile.user_id,
                            profile.display_name,
                            cast(null as text) as email
                        from public.profiles profile
                        where profile.user_id = ?
                          and profile.user_id <> ?
                          and profile.member_discovery_enabled = true
                          and profile.display_name is not null
                        limit 1
                        """,
                (resultSet, rowNumber) -> new DiscoveryRow(
                        resultSet.getObject("user_id", UUID.class),
                        resultSet.getString("display_name"),
                        resultSet.getString("email")),
                targetUserId,
                requesterUserId);

        return rows.stream().findFirst();
    }

    public RateLimitState consumeRateLimit(
            UUID requesterUserId,
            Instant now,
            Instant resetCutoff) {
        return jdbcTemplate.queryForObject(
                """
                        insert into public.user_discovery_rate_limits as limits (
                            user_id,
                            window_started_at,
                            request_count
                        )
                        values (?, ?, 1)
                        on conflict (user_id) do update
                        set
                            request_count = case
                                when limits.window_started_at <= ?
                                    then 1
                                else limits.request_count + 1
                            end,
                            window_started_at = case
                                when limits.window_started_at <= ?
                                    then excluded.window_started_at
                                else limits.window_started_at
                            end
                        returning request_count, window_started_at
                        """,
                (resultSet, rowNumber) -> new RateLimitState(
                        resultSet.getInt("request_count"),
                        resultSet.getTimestamp("window_started_at").toInstant()),
                requesterUserId,
                Timestamp.from(now),
                Timestamp.from(resetCutoff),
                Timestamp.from(resetCutoff));
    }

    private String escapeLikePattern(String value) {
        return value
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
    }
}
