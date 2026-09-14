package com.debtulator.backend.inbox;

import com.debtulator.backend.inbox.dto.InboxRequestResponse;
import com.debtulator.backend.memberlinking.MemberLinkRequest;
import com.debtulator.backend.memberlinking.MemberLinkRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MemberLinkInboxRequestSource implements InboxRequestSource {

    private final MemberLinkRequestRepository requestRepository;

    @Override
    public InboxRequestType type() {
        return InboxRequestType.MEMBER_LINK;
    }

    @Override
    public List<InboxRequestResponse> find(
            UUID userId,
            InboxRequestScope scope,
            int limit
    ) {
        var pageable = PageRequest.of(0, limit);

        List<MemberLinkRequest> requests = switch (scope) {
            case NEEDS_ACTION ->
                    requestRepository.findPendingIncoming(userId, pageable);
            case SENT ->
                    requestRepository.findPendingOutgoing(userId, pageable);
            case HISTORY ->
                    requestRepository.findHistoryForUser(userId, pageable);
        };

        return requests.stream()
                .map(request -> toResponse(request, userId))
                .toList();
    }

    private InboxRequestResponse toResponse(
            MemberLinkRequest request,
            UUID currentUserId
    ) {
        boolean outgoing = request.getRequesterUserId().equals(currentUserId);

        return new InboxRequestResponse(
                request.getId(),
                type().getValue(),
                null,
                outgoing ? "outgoing" : "incoming",
                request.getStatus(),
                outgoing
                        ? request.getTargetUserId()
                        : request.getRequesterUserId(),
                outgoing
                        ? request.getTargetName()
                        : request.getRequesterName(),
                request.getCreatedAt(),
                updatedAt(request)
        );
    }

    private Instant updatedAt(MemberLinkRequest request) {
        if (request.getUnlinkedAt() != null) {
            return request.getUnlinkedAt();
        }

        if (request.getResolvedAt() != null) {
            return request.getResolvedAt();
        }

        return request.getCreatedAt();
    }
}
