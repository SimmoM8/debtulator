package com.debtulator.backend.userdiscovery.dto;

import java.util.UUID;

public record UserDiscoveryResponse(
        UUID id,
        String displayName,
        String detail
) {
}
