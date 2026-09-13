package com.debtulator.backend.profiles.dto;

public record DiscoveryPreferencesResponse(
        boolean memberDiscoveryEnabled,
        boolean discoverableByUsername,
        boolean discoverableByName,
        boolean discoverableByEmail,
        boolean discoverableByPhone
) {
}
