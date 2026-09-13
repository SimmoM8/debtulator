package com.debtulator.backend.profiles.dto;

public record UpdateDiscoveryPreferencesRequest(
        boolean memberDiscoveryEnabled,
        boolean discoverableByUsername,
        boolean discoverableByName,
        boolean discoverableByEmail,
        boolean discoverableByPhone
) {
}
