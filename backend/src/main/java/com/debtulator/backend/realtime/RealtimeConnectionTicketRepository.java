package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class RealtimeConnectionTicketRepository {

    private final JdbcTemplate jdbcTemplate;

    public void insert(
            UUID id,
            UUID userId,
            Instant createdAt,
            Instant expiresAt,
            long resumeAfterSequence
    ) {
        jdbcTemplate.update(
                """
                insert into public.realtime_connection_tickets (
                    id,
                    user_id,
                    created_at,
                    expires_at,
                    resume_after_sequence,
                    consumed_at
                )
                values (?, ?, ?, ?, ?, null)
                """,
                id,
                userId,
                Timestamp.from(createdAt),
                Timestamp.from(expiresAt),
                resumeAfterSequence
        );
    }

    public Optional<RealtimeConnectionTicket> consume(
            UUID id,
            Instant consumedAt
    ) {
        return jdbcTemplate.query(
                """
                update public.realtime_connection_tickets
                set consumed_at = ?
                where id = ?
                  and consumed_at is null
                  and expires_at > ?
                returning user_id, resume_after_sequence
                """,
                (resultSet, rowNumber) -> new RealtimeConnectionTicket(
                        resultSet.getObject("user_id", UUID.class),
                        resultSet.getLong("resume_after_sequence")
                ),
                Timestamp.from(consumedAt),
                id,
                Timestamp.from(consumedAt)
        ).stream().findFirst();
    }

    public void deleteExpired(Instant now) {
        jdbcTemplate.update(
                """
                delete from public.realtime_connection_tickets
                where expires_at <= ?
                """,
                Timestamp.from(now)
        );
    }
}
