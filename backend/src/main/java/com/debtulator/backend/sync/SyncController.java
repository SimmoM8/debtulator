package com.debtulator.backend.sync;

import com.debtulator.backend.security.AuthenticatedUserProvider;
import com.debtulator.backend.sync.dto.BootstrapStartResponse;
import com.debtulator.backend.sync.dto.PullSyncResponse;
import com.debtulator.backend.sync.dto.PushSyncRequest;
import com.debtulator.backend.sync.dto.PushSyncResponse;
import com.debtulator.backend.sync.dto.SyncBootstrapPageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @PostMapping("/mutations")
    public PushSyncResponse pushMutations(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PushSyncRequest request
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();
        return syncService.push(userId, request);
    }

    @GetMapping("/changes")
    public PullSyncResponse pullChanges(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") long after,
            @RequestParam(defaultValue = "500") int limit
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();
        return syncService.pull(userId, after, limit);
    }

    @GetMapping("/bootstrap")
    public BootstrapStartResponse startBootstrap(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();
        return syncService.startBootstrap(userId);
    }

    @GetMapping("/bootstrap/{entityType}")
    public SyncBootstrapPageResponse bootstrapEntity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String entityType,
            @RequestParam(required = false) UUID afterId,
            @RequestParam(defaultValue = "500") int limit
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();
        return syncService.bootstrap(userId, entityType, afterId, limit);
    }
}

