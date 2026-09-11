package com.debtulator.backend.discovery.dto;

import java.util.UUID;

public record UserDiscoveryResponse(
        UUID id,
        String displayName,
        String detail
) {
}
