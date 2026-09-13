package com.debtulator.backend.inbox;

import com.debtulator.backend.inbox.dto.InboxRequestResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InboxService {

    private static final int MAX_LIMIT = 100;

    private final List<InboxRequestSource> sources;

    @Transactional(readOnly = true)
    public List<InboxRequestResponse> getRequests(
            UUID userId,
            String scopeValue,
            List<String> typeValues,
            int limit
    ) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new InboxException(
                    InboxException.Reason.INVALID_LIMIT,
                    "Inbox request limit must be between 1 and 100."
            );
        }

        InboxRequestScope scope = InboxRequestScope.fromValue(scopeValue);
        Set<InboxRequestType> requestedTypes = parseTypes(typeValues);

        return sources.stream()
                .filter(source -> requestedTypes.contains(source.type()))
                .flatMap(source -> source.find(userId, scope, limit).stream())
                .sorted(
                        Comparator
                                .comparing(InboxRequestResponse::updatedAt)
                                .reversed()
                                .thenComparing(InboxRequestResponse::requestId)
                )
                .limit(limit)
                .toList();
    }

    private Set<InboxRequestType> parseTypes(List<String> typeValues) {
        if (typeValues == null || typeValues.isEmpty()) {
            return EnumSet.allOf(InboxRequestType.class);
        }

        return typeValues.stream()
                .map(InboxRequestType::fromValue)
                .collect(Collectors.toCollection(
                        () -> EnumSet.noneOf(InboxRequestType.class)
                ));
    }
}
