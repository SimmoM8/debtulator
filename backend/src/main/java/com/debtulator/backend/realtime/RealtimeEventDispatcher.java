package com.debtulator.backend.realtime;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class RealtimeEventDispatcher {

    private static final int BATCH_SIZE = 100;

    private final RealtimeEventRepository eventRepository;
    private final RealtimeSessionRegistry sessionRegistry;

    private long cursor;

    /**
     * Realtime is an acceleration channel, not the source of truth. Starting
     * from the current cursor prevents historical events from being replayed as
     * fresh toasts after a backend restart. The Inbox API recovers any state
     * that changed while the app or backend instance was disconnected.
     */
    @PostConstruct
    void initializeCursor() {
        cursor = eventRepository.currentSequence();
    }

    @Scheduled(
            fixedDelayString = "${debtulator.realtime.poll-delay-ms:500}"
    )
    public synchronized void dispatch() {
        while (true) {
            List<StoredRealtimeEvent> events =
                    eventRepository.findAfter(cursor, BATCH_SIZE);

            if (events.isEmpty()) {
                return;
            }

            for (StoredRealtimeEvent event : events) {
                sessionRegistry.publish(event);
                cursor = event.sequence();
            }

            if (events.size() < BATCH_SIZE) {
                return;
            }
        }
    }

    @Scheduled(
            fixedDelayString = "${debtulator.realtime.keepalive-delay-ms:25000}"
    )
    public void keepAlive() {
        sessionRegistry.keepAlive();
    }
}
