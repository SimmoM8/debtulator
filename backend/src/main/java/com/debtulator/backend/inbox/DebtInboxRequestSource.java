package com.debtulator.backend.inbox;

import com.debtulator.backend.agreements.AgreementRepository;
import com.debtulator.backend.agreements.AgreementRequest;
import com.debtulator.backend.inbox.dto.InboxRequestResponse;
import com.debtulator.backend.profiles.Profile;
import com.debtulator.backend.profiles.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DebtInboxRequestSource implements InboxRequestSource {

    private static final String ENTITY_TYPE = "debt";

    private final AgreementRepository agreementRepository;
    private final ProfileRepository profileRepository;

    @Override
    public InboxRequestType type() {
        return InboxRequestType.DEBT;
    }

    @Override
    public List<InboxRequestResponse> find(
            UUID userId,
            InboxRequestScope scope,
            int limit
    ) {
        List<AgreementRequest> requests = switch (scope) {
            case NEEDS_ACTION -> agreementRepository.findPendingIncomingByEntity(
                    userId,
                    ENTITY_TYPE,
                    limit
            );
            case SENT -> agreementRepository.findPendingOutgoingByEntity(
                    userId,
                    ENTITY_TYPE,
                    limit
            );
            case HISTORY -> agreementRepository.findHistoryByEntity(
                    userId,
                    ENTITY_TYPE,
                    limit
            );
        };

        Map<UUID, String> names = counterpartyNames(requests, userId);

        return requests.stream()
                .map(request -> toResponse(
                        request,
                        userId,
                        names.get(counterpartyUserId(request, userId))
                ))
                .toList();
    }

    private Map<UUID, String> counterpartyNames(
            List<AgreementRequest> requests,
            UUID currentUserId
    ) {
        List<UUID> userIds = requests.stream()
                .map(request -> counterpartyUserId(request, currentUserId))
                .distinct()
                .toList();

        Map<UUID, String> names = new HashMap<>();
        for (Profile profile : profileRepository.findAllById(userIds)) {
            names.put(profile.getUserId(), profileName(profile));
        }
        return names;
    }

    private InboxRequestResponse toResponse(
            AgreementRequest request,
            UUID currentUserId,
            String counterpartyName
    ) {
        boolean outgoing = request.requesterUserId().equals(currentUserId);
        return new InboxRequestResponse(
                request.id(),
                type().getValue(),
                request.action(),
                outgoing ? "outgoing" : "incoming",
                request.status(),
                counterpartyUserId(request, currentUserId),
                counterpartyName != null ? counterpartyName : "Debtulator user",
                request.createdAt(),
                updatedAt(request)
        );
    }

    private UUID counterpartyUserId(AgreementRequest request, UUID currentUserId) {
        return request.requesterUserId().equals(currentUserId)
                ? request.targetUserId()
                : request.requesterUserId();
    }

    private String profileName(Profile profile) {
        if (profile.getName() != null && !profile.getName().isBlank()) {
            return profile.getName();
        }
        return "@" + profile.getUsername();
    }

    private Instant updatedAt(AgreementRequest request) {
        return request.resolvedAt() != null ? request.resolvedAt() : request.createdAt();
    }
}
