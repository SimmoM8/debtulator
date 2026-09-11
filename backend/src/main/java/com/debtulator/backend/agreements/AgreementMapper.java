package com.debtulator.backend.agreements;

import com.debtulator.backend.agreements.dto.AgreementRequestResponse;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class AgreementMapper {
    public AgreementRequestResponse toResponse(AgreementRequest request, UUID currentUserId) {
        boolean outgoing = request.requesterUserId().equals(currentUserId);
        return new AgreementRequestResponse(
                request.id(),
                outgoing ? "outgoing" : "incoming",
                outgoing ? request.targetUserId() : request.requesterUserId(),
                request.entityType(),
                request.entityId(),
                request.entityVersion(),
                request.action(),
                request.payload(),
                request.status(),
                request.createdAt(),
                request.resolvedAt()
        );
    }
}
