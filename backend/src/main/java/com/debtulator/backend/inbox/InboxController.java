package com.debtulator.backend.inbox;

import com.debtulator.backend.inbox.dto.InboxRequestResponse;
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
@RequestMapping("/api/v1/inbox")
@RequiredArgsConstructor
public class InboxController {

    private final InboxService inboxService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/requests")
    public ResponseEntity<List<InboxRequestResponse>> getRequests(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "needs_action") String scope,
            @RequestParam(name = "type", required = false) List<String> types,
            @RequestParam(defaultValue = "100") int limit
    ) {
        UUID userId = authenticatedUserProvider.from(jwt).id();

        return noStore(ResponseEntity.ok()).body(
                inboxService.getRequests(userId, scope, types, limit)
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
