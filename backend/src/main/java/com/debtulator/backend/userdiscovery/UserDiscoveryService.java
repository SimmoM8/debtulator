package com.debtulator.backend.userdiscovery;

import com.debtulator.backend.userdiscovery.dto.UserDiscoveryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(noRollbackFor = UserDiscoveryException.class)
public class UserDiscoveryService {
    static final int MAX_RESULTS = 10;
    static final int MAX_REQUESTS_PER_WINDOW = 30;
    static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);
    private static final int MIN_NAME_QUERY_LENGTH = 3;
    private static final int MAX_NAME_QUERY_LENGTH = 120;
    private static final int MAX_QUERY_LENGTH = 320;

    private final UserDiscoveryRepository userDiscoveryRepository;
    private final Clock clock;

    public List<UserDiscoveryResponse> search(UUID requesterUserId, String rawQuery) {
        String query = normalizeQuery(rawQuery);
        SearchType searchType = determineSearchType(query);
        enforceRateLimit(requesterUserId);
        return switch (searchType) {
            case USER_ID -> searchByUserId(requesterUserId, query);
            case EMAIL -> searchByEmail(requesterUserId, query);
            case NAME -> searchByName(requesterUserId, query);
        };
    }

    private List<UserDiscoveryResponse> searchByUserId(UUID requesterUserId, String query) {
        return userDiscoveryRepository.findByExactUserId(requesterUserId, UUID.fromString(query))
                .map(row -> List.of(toResponse(row, "Debtulator user")))
                .orElseGet(List::of);
    }

    private List<UserDiscoveryResponse> searchByEmail(UUID requesterUserId, String query) {
        String email = query.toLowerCase(Locale.ROOT);
        return userDiscoveryRepository.findByExactEmail(requesterUserId, email)
                .map(row -> List.of(toResponse(row, row.email().toLowerCase(Locale.ROOT))))
                .orElseGet(List::of);
    }

    private List<UserDiscoveryResponse> searchByName(UUID requesterUserId, String query) {
        int length = query.codePointCount(0, query.length());
        if (length < MIN_NAME_QUERY_LENGTH || length > MAX_NAME_QUERY_LENGTH) {
            throw new UserDiscoveryException(
                    UserDiscoveryException.Reason.INVALID_QUERY,
                    "Name searches require between 3 and 120 characters."
            );
        }
        return userDiscoveryRepository.searchByName(requesterUserId, query, MAX_RESULTS)
                .stream().map(row -> toResponse(row, "Debtulator user")).toList();
    }

    private UserDiscoveryResponse toResponse(UserDiscoveryRepository.DiscoveryRow row, String detail) {
        return new UserDiscoveryResponse(row.id(), row.name(), detail);
    }

    private String normalizeQuery(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isEmpty() || query.codePointCount(0, query.length()) > MAX_QUERY_LENGTH) {
            throw new UserDiscoveryException(
                    UserDiscoveryException.Reason.INVALID_QUERY,
                    "A valid discovery query is required."
            );
        }
        return query;
    }

    private SearchType determineSearchType(String query) {
        try {
            UUID.fromString(query);
            return SearchType.USER_ID;
        } catch (IllegalArgumentException ignored) {}
        return query.contains("@") ? SearchType.EMAIL : SearchType.NAME;
    }

    private void enforceRateLimit(UUID requesterUserId) {
        Instant now = Instant.now(clock);
        var state = userDiscoveryRepository.consumeRateLimit(
                requesterUserId, now, now.minus(RATE_LIMIT_WINDOW));
        if (state.requestCount() <= MAX_REQUESTS_PER_WINDOW) return;
        long retryAfterMillis = Math.max(
                1,
                Duration.between(now, state.windowStartedAt().plus(RATE_LIMIT_WINDOW)).toMillis()
        );
        throw new UserDiscoveryException(
                UserDiscoveryException.Reason.RATE_LIMITED,
                "Too many user-discovery requests. Try again shortly.",
                Math.max(1, (retryAfterMillis + 999) / 1000)
        );
    }

    private enum SearchType { USER_ID, EMAIL, NAME }
}
