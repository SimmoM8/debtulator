package com.debtulator.backend.profiles.dto;

public record DiscoveryPreferencesResponse(
        boolean memberDiscoveryEnabled,
        boolean discoverableByDisplayName,
        boolean discoverableByEmail
) {
}
