package com.debtulator.backend.profiles;

import com.debtulator.backend.profiles.dto.ProfileResponse;
import com.debtulator.backend.profiles.dto.UpdateProfileRequest;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ProfileMapper profileMapper;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();

        return noStore(ResponseEntity.ok()).body(
                profileMapper.toResponse(profileService.get(userId))
        );
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();

        Profile profile = profileService.update(
                userId,
                request.displayName(),
                request.baseCurrency()
        );

        return noStore(ResponseEntity.ok()).body(
                profileMapper.toResponse(profile)
        );
    }

    private ResponseEntity.BodyBuilder noStore(
            ResponseEntity.BodyBuilder builder
    ) {
        return builder
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache");
    }
}
