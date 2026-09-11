package com.debtulator.backend.profiles.dto;
public record UpdateDiscoveryPreferencesRequest(boolean memberDiscoveryEnabled, boolean discoverableByName, boolean discoverableByEmail) {}
