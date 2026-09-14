package com.debtulator.backend.realtime;

import com.debtulator.backend.realtime.dto.RealtimeEventResponse;
import com.debtulator.backend.realtime.dto.RealtimeEventsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RealtimeEventService {

    private static final int DEFAULT_LIMIT = 100;
    private static final int MAX_LIMIT = 500;

    private final RealtimeEventRepository eventRepository;

    @Transactional(readOnly = true)
    public RealtimeEventsResponse poll(UUID userId, Long after, Integer requestedLimit) {
        int limit = requestedLimit == null ? DEFAULT_LIMIT : requestedLimit;
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("Realtime event limit must be between 1 and 500.");
        }
        if (after != null && after < 0) {
            throw new IllegalArgumentException("Realtime event cursor must be zero or greater.");
        }

        long upperBound = eventRepository.currentSequence();

        // A fresh app process starts at the current boundary. Durable business
        // state is recovered through Inbox/sync rather than replayed as old toasts.
        if (after == null) {
            return new RealtimeEventsResponse(List.of(), Long.toString(upperBound), false);
        }

        List<StoredRealtimeEvent> rows = eventRepository.findForRecipientBetween(
                userId,
                after,
                upperBound,
                limit + 1
        );

        boolean hasMore = rows.size() > limit;
        List<StoredRealtimeEvent> page = hasMore ? rows.subList(0, limit) : rows;
        long nextSequence = hasMore && !page.isEmpty()
                ? page.getLast().sequence()
                : upperBound;

        return new RealtimeEventsResponse(
                page.stream().map(RealtimeEventResponse::from).toList(),
                Long.toString(nextSequence),
                hasMore
        );
    }
}
