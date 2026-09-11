package com.debtulator.backend.profiles.dto;

public record UpdateDiscoveryPreferencesRequest(
        boolean memberDiscoveryEnabled,
        boolean discoverableByDisplayName,
        boolean discoverableByEmail
) {
}
