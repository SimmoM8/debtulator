package com.debtulator.backend.realtime;

import com.debtulator.backend.realtime.dto.RealtimeConnectionTicketResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RealtimeConnectionTicketServiceTest {

    @Test
    void snapshotsCurrentSequenceForFirstConnection() {
        RealtimeConnectionTicketRepository repository =
                mock(RealtimeConnectionTicketRepository.class);
        RealtimeEventRepository eventRepository =
                mock(RealtimeEventRepository.class);
        Instant now = Instant.parse("2026-09-14T00:00:00Z");
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        RealtimeConnectionTicketService service =
                new RealtimeConnectionTicketService(
                        repository,
                        eventRepository,
                        clock
                );
        UUID userId = UUID.randomUUID();

        when(eventRepository.currentSequence()).thenReturn(42L);

        RealtimeConnectionTicketResponse response =
                service.issue(userId, null);

        assertEquals(now.plusSeconds(30), response.expiresAt());
        verify(repository).deleteExpired(now);
        verify(repository).insert(
                response.ticket(),
                userId,
                now,
                now.plusSeconds(30),
                42L
        );
    }

    @Test
    void preservesClientResumeSequenceOnReconnect() {
        RealtimeConnectionTicketRepository repository =
                mock(RealtimeConnectionTicketRepository.class);
        RealtimeEventRepository eventRepository =
                mock(RealtimeEventRepository.class);
        Instant now = Instant.parse("2026-09-14T00:00:00Z");
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        RealtimeConnectionTicketService service =
                new RealtimeConnectionTicketService(
                        repository,
                        eventRepository,
                        clock
                );
        UUID userId = UUID.randomUUID();

        RealtimeConnectionTicketResponse response =
                service.issue(userId, 17L);

        verify(repository).insert(
                response.ticket(),
                userId,
                now,
                now.plusSeconds(30),
                17L
        );
    }

    @Test
    void consumesTicketThroughRepository() {
        RealtimeConnectionTicketRepository repository =
                mock(RealtimeConnectionTicketRepository.class);
        RealtimeEventRepository eventRepository =
                mock(RealtimeEventRepository.class);
        Instant now = Instant.parse("2026-09-14T00:00:00Z");
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);
        RealtimeConnectionTicketService service =
                new RealtimeConnectionTicketService(
                        repository,
                        eventRepository,
                        clock
                );
        UUID ticket = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        RealtimeConnectionTicket connectionTicket =
                new RealtimeConnectionTicket(userId, 9L);

        when(repository.consume(ticket, now))
                .thenReturn(Optional.of(connectionTicket));

        Optional<RealtimeConnectionTicket> result = service.consume(ticket);

        assertTrue(result.isPresent());
        assertEquals(connectionTicket, result.orElseThrow());
    }
}
