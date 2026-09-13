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
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(noRollbackFor = UserDiscoveryException.class)
public class UserDiscoveryService {
    static final int MAX_RESULTS = 10;
    static final int MAX_REQUESTS_PER_WINDOW = 30;
    static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);

    private static final int MIN_QUERY_LENGTH = 3;
    private static final int MAX_QUERY_LENGTH = 320;
    private static final Pattern E164_PHONE_PATTERN = Pattern.compile("^\\+[1-9][0-9]{7,14}$");

    private final UserDiscoveryRepository userDiscoveryRepository;
    private final Clock clock;

    public List<UserDiscoveryResponse> search(UUID requesterUserId, String rawQuery) {
        String query = normalizeQuery(rawQuery);
        enforceRateLimit(requesterUserId);

        String exactEmail = query.contains("@")
                ? query.toLowerCase(Locale.ROOT)
                : null;
        String exactPhone = E164_PHONE_PATTERN.matcher(query).matches()
                ? query
                : null;

        return userDiscoveryRepository.search(
                        requesterUserId,
                        query,
                        exactEmail,
                        exactPhone,
                        MAX_RESULTS
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private UserDiscoveryResponse toResponse(UserDiscoveryRepository.DiscoveryRow row) {
        return new UserDiscoveryResponse(
                row.id(),
                row.name(),
                row.username()
        );
    }

    private String normalizeQuery(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        int length = query.codePointCount(0, query.length());

        if (length < MIN_QUERY_LENGTH || length > MAX_QUERY_LENGTH) {
            throw new UserDiscoveryException(
                    UserDiscoveryException.Reason.INVALID_QUERY,
                    "Discovery searches require between 3 and 320 characters."
            );
        }

        return query;
    }

    private void enforceRateLimit(UUID requesterUserId) {
        Instant now = Instant.now(clock);
        var state = userDiscoveryRepository.consumeRateLimit(
                requesterUserId,
                now,
                now.minus(RATE_LIMIT_WINDOW)
        );

        if (state.requestCount() <= MAX_REQUESTS_PER_WINDOW) {
            return;
        }

        long retryAfterMillis = Math.max(
                1,
                Duration.between(
                        now,
                        state.windowStartedAt().plus(RATE_LIMIT_WINDOW)
                ).toMillis()
        );

        throw new UserDiscoveryException(
                UserDiscoveryException.Reason.RATE_LIMITED,
                "Too many user-discovery requests. Try again shortly.",
                Math.max(1, (retryAfterMillis + 999) / 1000)
        );
    }
}
