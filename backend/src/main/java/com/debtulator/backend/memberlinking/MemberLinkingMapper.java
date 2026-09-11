package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.MemberLinkRequestResponse;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class MemberLinkingMapper {
    public MemberLinkRequestResponse toResponse(MemberLinkRequest request, UUID currentUserId) {
        boolean outgoing = request.getRequesterUserId().equals(currentUserId);
        return new MemberLinkRequestResponse(
                request.getId(),
                outgoing ? "outgoing" : "incoming",
                request.getStatus(),
                outgoing ? request.getTargetUserId() : request.getRequesterUserId(),
                outgoing ? request.getTargetName() : request.getRequesterName(),
                outgoing ? request.getRequesterMemberId() : request.getTargetMemberId(),
                request.getCreatedAt(),
                request.getResolvedAt(),
                request.getUnlinkedAt()
        );
    }
}
