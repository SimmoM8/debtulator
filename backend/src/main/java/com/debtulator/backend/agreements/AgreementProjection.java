package com.debtulator.backend.agreements;

import java.util.UUID;

public record AgreementProjection(
        String status,
        UUID collaborationId,
        Long agreedRevision
) {
    public static AgreementProjection privateState() {
        return new AgreementProjection("private", null, null);
    }

    public static AgreementProjection pending(UUID collaborationId, Long agreedRevision) {
        return new AgreementProjection("pending", collaborationId, agreedRevision);
    }

    public static AgreementProjection agreed(UUID collaborationId, long agreedRevision) {
        return new AgreementProjection("agreed", collaborationId, agreedRevision);
    }

    public static AgreementProjection disagreed(UUID collaborationId, Long agreedRevision) {
        return new AgreementProjection("disagreed", collaborationId, agreedRevision);
    }
}
