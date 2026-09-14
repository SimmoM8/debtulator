package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RealtimeEventPublisher {

    private final RealtimeEventRepository eventRepository;
    private final Clock clock;

    /**
     * Realtime events must be written in the same transaction as the domain
     * change that produced them. If that transaction rolls back, the event
     * rolls back with it.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(
            UUID recipientUserId,
            String eventType,
            Map<String, Object> payload
    ) {
        eventRepository.insert(
                UUID.randomUUID(),
                recipientUserId,
                eventType,
                Map.copyOf(payload),
                Instant.now(clock)
        );
    }
}
