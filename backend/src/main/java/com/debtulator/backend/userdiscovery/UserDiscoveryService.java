package com.debtulator.backend.userdiscovery;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.debtulator.backend.userdiscovery.dto.UserDiscoveryResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(noRollbackFor = UserDiscoveryException.class)
public class UserDiscoveryService {

        private enum SearchType {
                USER_ID,
                EMAIL,
                DISPLAY_NAME
        }

        static final int MAX_RESULTS = 10;
        static final int MAX_REQUESTS_PER_WINDOW = 30;

        static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);
        private static final int MIN_DISPLAY_NAME_QUERY_LENGTH = 3;
        private static final int MAX_DISPLAY_NAME_QUERY_LENGTH = 120;

        private static final int MAX_QUERY_LENGTH = 320;
        private final UserDiscoveryRepository userDiscoveryRepository;

        private final Clock clock;

        public List<UserDiscoveryResponse> search(
                        UUID requesterUserId,
                        String rawQuery) {
                String query = normalizeQuery(rawQuery);
                SearchType searchType = determineSearchType(query);

                enforceRateLimit(requesterUserId);

                return switch (searchType) {
                        case USER_ID -> searchByUserId(requesterUserId, query);
                        case EMAIL -> searchByEmail(requesterUserId, query);
                        case DISPLAY_NAME -> searchByDisplayName(requesterUserId, query);
                };
        }

        private List<UserDiscoveryResponse> searchByUserId(
                        UUID requesterUserId,
                        String query) {
                UUID targetUserId = UUID.fromString(query);

                return userDiscoveryRepository
                                .findByExactUserId(requesterUserId, targetUserId)
                                .map(row -> List.of(toResponse(
                                                row,
                                                "Debtulator user")))
                                .orElseGet(List::of);
        }

        private List<UserDiscoveryResponse> searchByEmail(
                        UUID requesterUserId,
                        String query) {
                String normalizedEmail = query.toLowerCase(Locale.ROOT);

                return userDiscoveryRepository
                                .findByExactEmail(requesterUserId, normalizedEmail)
                                .map(row -> List.of(toResponse(
                                                row,
                                                row.email().toLowerCase(Locale.ROOT))))
                                .orElseGet(List::of);
        }

        private List<UserDiscoveryResponse> searchByDisplayName(
                        UUID requesterUserId,
                        String query) {
                int length = query.codePointCount(0, query.length());

                if (length < MIN_DISPLAY_NAME_QUERY_LENGTH) {
                        throw new UserDiscoveryException(
                                        UserDiscoveryException.Reason.INVALID_QUERY,
                                        "Display-name searches require at least "
                                                        + MIN_DISPLAY_NAME_QUERY_LENGTH
                                                        + " characters.");
                }

                if (length > MAX_DISPLAY_NAME_QUERY_LENGTH) {
                        throw new UserDiscoveryException(
                                        UserDiscoveryException.Reason.INVALID_QUERY,
                                        "Display-name searches may not exceed "
                                                        + MAX_DISPLAY_NAME_QUERY_LENGTH
                                                        + " characters.");
                }

                return userDiscoveryRepository
                                .searchByDisplayName(
                                                requesterUserId,
                                                query,
                                                MAX_RESULTS)
                                .stream()
                                .map(row -> toResponse(
                                                row,
                                                "Debtulator user"))
                                .toList();
        }

        private UserDiscoveryResponse toResponse(
                        UserDiscoveryRepository.DiscoveryRow row,
                        String detail) {
                return new UserDiscoveryResponse(
                                row.id(),
                                row.displayName(),
                                detail);
        }

        private String normalizeQuery(String rawQuery) {
                String query = rawQuery == null
                                ? ""
                                : rawQuery.trim();

                if (query.isEmpty()) {
                        throw new UserDiscoveryException(
                                        UserDiscoveryException.Reason.INVALID_QUERY,
                                        "A discovery query is required.");
                }

                if (query.codePointCount(0, query.length()) > MAX_QUERY_LENGTH) {
                        throw new UserDiscoveryException(
                                        UserDiscoveryException.Reason.INVALID_QUERY,
                                        "The discovery query is too long.");
                }

                return query;
        }

        private SearchType determineSearchType(String query) {
                try {
                        UUID.fromString(query);
                        return SearchType.USER_ID;
                } catch (IllegalArgumentException ignored) {
                        // Not a UUID; continue with the other allowed search types.
                }

                if (query.contains("@")) {
                        return SearchType.EMAIL;
                }

                return SearchType.DISPLAY_NAME;
        }

        private void enforceRateLimit(UUID requesterUserId) {
                Instant now = Instant.now(clock);

                UserDiscoveryRepository.RateLimitState state = userDiscoveryRepository.consumeRateLimit(
                                requesterUserId,
                                now,
                                now.minus(RATE_LIMIT_WINDOW));

                if (state.requestCount() <= MAX_REQUESTS_PER_WINDOW) {
                        return;
                }

                Instant resetAt = state.windowStartedAt().plus(RATE_LIMIT_WINDOW);
                long retryAfterMillis = Math.max(
                                1,
                                Duration.between(now, resetAt).toMillis());
                long retryAfterSeconds = Math.max(
                                1,
                                (retryAfterMillis + 999) / 1000);

                throw new UserDiscoveryException(
                                UserDiscoveryException.Reason.RATE_LIMITED,
                                "Too many user-discovery requests. Try again shortly.",
                                retryAfterSeconds);
        }
}
