package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class RealtimeEventRepository {

    private static final TypeReference<Map<String, Object>> MAP_TYPE =
            new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public void insert(
            UUID id,
            UUID recipientUserId,
            String eventType,
            Map<String, Object> payload,
            Instant occurredAt
    ) {
        jdbcTemplate.update(
                """
                insert into public.outbox_events (
                    id,
                    recipient_user_id,
                    event_type,
                    payload,
                    occurred_at
                )
                values (?, ?, ?, cast(? as jsonb), ?)
                """,
                id,
                recipientUserId,
                eventType,
                writePayload(payload),
                Timestamp.from(occurredAt)
        );
    }

    public long currentSequence() {
        Long sequence = jdbcTemplate.queryForObject(
                "select coalesce(max(sequence), 0) from public.outbox_events",
                Long.class
        );

        return sequence != null ? sequence : 0L;
    }

    public List<StoredRealtimeEvent> findAfter(long sequence, int limit) {
        return jdbcTemplate.query(
                """
                select
                    sequence,
                    id,
                    recipient_user_id,
                    event_type,
                    payload,
                    occurred_at
                from public.outbox_events
                where sequence > ?
                order by sequence
                limit ?
                """,
                (resultSet, rowNumber) -> new StoredRealtimeEvent(
                        resultSet.getLong("sequence"),
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("recipient_user_id", UUID.class),
                        resultSet.getString("event_type"),
                        readPayload(resultSet.getString("payload")),
                        resultSet.getTimestamp("occurred_at").toInstant()
                ),
                sequence,
                limit
        );
    }

    public List<StoredRealtimeEvent> findForRecipientAfter(
            UUID recipientUserId,
            long sequence,
            int limit
    ) {
        return jdbcTemplate.query(
                """
                select
                    sequence,
                    id,
                    recipient_user_id,
                    event_type,
                    payload,
                    occurred_at
                from public.outbox_events
                where recipient_user_id = ?
                  and sequence > ?
                order by sequence
                limit ?
                """,
                (resultSet, rowNumber) -> new StoredRealtimeEvent(
                        resultSet.getLong("sequence"),
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("recipient_user_id", UUID.class),
                        resultSet.getString("event_type"),
                        readPayload(resultSet.getString("payload")),
                        resultSet.getTimestamp("occurred_at").toInstant()
                ),
                recipientUserId,
                sequence,
                limit
        );
    }

    private String writePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not serialize realtime event payload.",
                    exception
            );
        }
    }

    private Map<String, Object> readPayload(String payload) {
        try {
            return objectMapper.readValue(payload, MAP_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not deserialize realtime event payload.",
                    exception
            );
        }
    }
}
