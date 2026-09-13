package com.debtulator.backend.userdiscovery;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserDiscoveryRepository {
    private final NamedParameterJdbcTemplate namedJdbcTemplate;
    private final JdbcTemplate jdbcTemplate;

    public List<DiscoveryRow> search(
            UUID requesterUserId,
            String query,
            String exactEmail,
            String exactPhone,
            int limit
    ) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("requesterUserId", requesterUserId)
                .addValue("query", query)
                .addValue("exactEmail", exactEmail, Types.VARCHAR)
                .addValue("exactPhone", exactPhone, Types.VARCHAR)
                .addValue("limit", limit);

        return namedJdbcTemplate.query(
                """
                select
                    profile.user_id,
                    profile.name,
                    profile.username,
                    word_similarity(lower(:query), lower(profile.username)) as username_score,
                    word_similarity(lower(:query), lower(profile.name)) as name_score,
                    (
                        :exactEmail is not null
                        and profile.discoverable_by_email = true
                        and account.email is not null
                        and lower(account.email) = :exactEmail
                    ) as email_exact,
                    (
                        :exactPhone is not null
                        and profile.discoverable_by_phone = true
                        and profile.phone_number = :exactPhone
                    ) as phone_exact
                from public.profiles profile
                left join public.user_discovery_auth_accounts account
                    on account.user_id = profile.user_id
                where profile.user_id <> :requesterUserId
                  and profile.member_discovery_enabled = true
                  and profile.name is not null
                  and (
                        (
                            profile.discoverable_by_username = true
                            and word_similarity(
                                lower(:query),
                                lower(profile.username)
                            ) >= 0.70
                        )
                        or (
                            profile.discoverable_by_name = true
                            and word_similarity(
                                lower(:query),
                                lower(profile.name)
                            ) >= 0.90
                        )
                        or (
                            :exactEmail is not null
                            and profile.discoverable_by_email = true
                            and account.email is not null
                            and lower(account.email) = :exactEmail
                        )
                        or (
                            :exactPhone is not null
                            and profile.discoverable_by_phone = true
                            and profile.phone_number = :exactPhone
                        )
                  )
                order by
                    email_exact desc,
                    phone_exact desc,
                    case when lower(profile.username) = lower(:query) then 0 else 1 end,
                    username_score desc,
                    name_score desc,
                    lower(profile.username),
                    profile.user_id
                limit :limit
                """,
                parameters,
                (rs, row) -> new DiscoveryRow(
                        rs.getObject("user_id", UUID.class),
                        rs.getString("name"),
                        rs.getString("username")
                )
        );
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
                requesterUserId,
                Timestamp.from(now),
                Timestamp.from(resetCutoff),
                Timestamp.from(resetCutoff));
    }

    public record DiscoveryRow(UUID id, String name, String username) {}
    public record RateLimitState(int requestCount, Instant windowStartedAt) {}
}
