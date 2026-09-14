package com.debtulator.backend.realtime;

import com.debtulator.backend.realtime.dto.RealtimeConnectionTicketResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RealtimeConnectionTicketService {

    private static final Duration TICKET_TTL = Duration.ofSeconds(30);

    private final RealtimeConnectionTicketRepository ticketRepository;
    private final RealtimeEventRepository eventRepository;
    private final Clock clock;

    @Transactional
    public RealtimeConnectionTicketResponse issue(
            UUID userId,
            Long afterSequence
    ) {
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(TICKET_TTL);
        UUID ticket = UUID.randomUUID();
        long resumeAfterSequence = afterSequence != null
                ? afterSequence
                : eventRepository.currentSequence();

        ticketRepository.deleteExpired(now);
        ticketRepository.insert(
                ticket,
                userId,
                now,
                expiresAt,
                resumeAfterSequence
        );

        return new RealtimeConnectionTicketResponse(ticket, expiresAt);
    }

    @Transactional
    public Optional<RealtimeConnectionTicket> consume(UUID ticket) {
        return ticketRepository.consume(ticket, Instant.now(clock));
    }
}
