package com.debtulator.backend.realtime;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RealtimeEventPublisherTest {

    @Test
    void writesRecipientEventWithCurrentTimestamp() {
        RealtimeEventRepository repository = mock(RealtimeEventRepository.class);
        Instant now = Instant.parse("2026-09-14T00:00:00Z");
        RealtimeEventPublisher publisher = new RealtimeEventPublisher(
                repository,
                Clock.fixed(now, ZoneOffset.UTC)
        );
        UUID userId = UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "requestType", "member_link",
                "requestId", UUID.randomUUID().toString()
        );

        publisher.publish(
                userId,
                RealtimeEventTypes.INBOX_REQUEST_CREATED,
                payload
        );

        ArgumentCaptor<UUID> eventId = ArgumentCaptor.forClass(UUID.class);

        verify(repository).insert(
                eventId.capture(),
                eq(userId),
                eq(RealtimeEventTypes.INBOX_REQUEST_CREATED),
                eq(payload),
                eq(now)
        );
    }
}
