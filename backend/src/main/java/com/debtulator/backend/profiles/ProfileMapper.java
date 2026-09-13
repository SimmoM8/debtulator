package com.debtulator.backend.profiles;

import com.debtulator.backend.profiles.dto.DiscoveryPreferencesResponse;
import com.debtulator.backend.profiles.dto.ProfileResponse;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {
    public ProfileResponse toResponse(Profile profile) {
        return new ProfileResponse(
                profile.getUserId(),
                profile.getUsername(),
                profile.getName(),
                profile.getPhoneNumber(),
                profile.getBaseCurrency(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    public DiscoveryPreferencesResponse toDiscoveryPreferencesResponse(Profile profile) {
        return new DiscoveryPreferencesResponse(
                profile.isMemberDiscoveryEnabled(),
                profile.isDiscoverableByUsername(),
                profile.isDiscoverableByName(),
                profile.isDiscoverableByEmail(),
                profile.isDiscoverableByPhone()
        );
    }
}
