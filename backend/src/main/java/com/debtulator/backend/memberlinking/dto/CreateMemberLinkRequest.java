package com.debtulator.backend.memberlinking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateMemberLinkRequest(
        @NotNull UUID requestId,
        @NotNull UUID targetUserId,
        UUID memberId,
        @Size(max = 120) String displayName,
        boolean useTargetName
) {}
