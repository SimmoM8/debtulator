package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.MemberLinkRequestResponse;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class MemberLinkingMapper {

    public MemberLinkRequestResponse toResponse(
            MemberLinkRequest request,
            UUID currentUserId
    ) {
        boolean outgoing =
                request.getRequesterUserId().equals(currentUserId);

        UUID userId = outgoing
                ? request.getTargetUserId()
                : request.getRequesterUserId();

        String displayName = outgoing
                ? request.getTargetDisplayName()
                : request.getRequesterDisplayName();

        UUID memberId = outgoing
                ? request.getRequesterMemberId()
                : request.getTargetMemberId();

        return new MemberLinkRequestResponse(
                request.getId(),
                outgoing ? "outgoing" : "incoming",
                request.getStatus(),
                userId,
                displayName,
                memberId,
                request.getCreatedAt(),
                request.getResolvedAt(),
                request.getUnlinkedAt()
        );
    }
}
