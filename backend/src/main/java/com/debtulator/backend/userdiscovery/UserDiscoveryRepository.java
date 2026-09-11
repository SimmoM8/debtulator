package com.debtulator.backend.userdiscovery;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserDiscoveryRepository {
    private final JdbcTemplate jdbcTemplate;

    public List<DiscoveryRow> searchByName(UUID requesterUserId, String query, int limit) {
        String pattern = "%" + escapeLikePattern(query) + "%";
        return jdbcTemplate.query("""
                select profile.user_id, profile.name, cast(null as text) as email
                from public.profiles profile
                where profile.user_id <> ?
                  and profile.member_discovery_enabled = true
                  and profile.discoverable_by_name = true
                  and profile.name is not null
                  and lower(profile.name) like lower(?) escape '!'
                order by
                    case when lower(profile.name) = lower(?) then 0 else 1 end,
                    lower(profile.name),
                    profile.user_id
                limit ?
                """,
                (rs, row) -> new DiscoveryRow(
                        rs.getObject("user_id", UUID.class),
                        rs.getString("name"),
                        rs.getString("email")
                ),
                requesterUserId, pattern, query, limit);
    }

    public Optional<DiscoveryRow> findByExactEmail(UUID requesterUserId, String email) {
        return jdbcTemplate.query("""
                select profile.user_id, profile.name, account.email
                from public.profiles profile
                join public.user_discovery_auth_accounts account on account.user_id = profile.user_id
                where profile.user_id <> ?
                  and profile.member_discovery_enabled = true
                  and profile.discoverable_by_email = true
                  and profile.name is not null
                  and account.email is not null
                  and lower(account.email) = lower(?)
                limit 1
                """,
                (rs, row) -> new DiscoveryRow(
                        rs.getObject("user_id", UUID.class),
                        rs.getString("name"),
                        rs.getString("email")
                ),
                requesterUserId, email).stream().findFirst();
    }

    public Optional<DiscoveryRow> findByExactUserId(UUID requesterUserId, UUID targetUserId) {
        return jdbcTemplate.query("""
                select profile.user_id, profile.name, cast(null as text) as email
                from public.profiles profile
                where profile.user_id = ?
                  and profile.user_id <> ?
                  and profile.member_discovery_enabled = true
                  and profile.name is not null
                limit 1
                """,
                (rs, row) -> new DiscoveryRow(
                        rs.getObject("user_id", UUID.class),
                        rs.getString("name"),
                        rs.getString("email")
                ),
                targetUserId, requesterUserId).stream().findFirst();
    }

    public RateLimitState consumeRateLimit(UUID requesterUserId, Instant now, Instant resetCutoff) {
        return jdbcTemplate.queryForObject("""
                insert into public.user_discovery_rate_limits as limits (
                    user_id, window_started_at, request_count
                )
                values (?, ?, 1)
                on conflict (user_id) do update
                set request_count = case
                        when limits.window_started_at <= ? then 1
                        else limits.request_count + 1
                    end,
                    window_started_at = case
                        when limits.window_started_at <= ? then excluded.window_started_at
                        else limits.window_started_at
                    end
                returning request_count, window_started_at
                """,
                (rs, row) -> new RateLimitState(
                        rs.getInt("request_count"),
                        rs.getTimestamp("window_started_at").toInstant()
                ),
                requesterUserId, Timestamp.from(now), Timestamp.from(resetCutoff), Timestamp.from(resetCutoff));
    }

    private String escapeLikePattern(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    public record DiscoveryRow(UUID id, String name, String email) {}
    public record RateLimitState(int requestCount, Instant windowStartedAt) {}
}
