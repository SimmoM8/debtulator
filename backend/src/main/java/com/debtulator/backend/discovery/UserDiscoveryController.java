package com.debtulator.backend.discovery;

import com.debtulator.backend.discovery.dto.UserDiscoveryResponse;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discovery")
@RequiredArgsConstructor
public class UserDiscoveryController {

    private final UserDiscoveryService userDiscoveryService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/users")
    public ResponseEntity<List<UserDiscoveryResponse>> searchUsers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String query
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(userDiscoveryService.search(userId, query));
    }
}
