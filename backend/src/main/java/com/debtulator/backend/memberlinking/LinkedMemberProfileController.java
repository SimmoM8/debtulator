package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.LinkedAccountSummaryResponse;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/member-linking/linked-accounts")
@RequiredArgsConstructor
public class LinkedMemberProfileController {
    private final LinkedMemberProfileService linkedMemberProfileService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping
    public ResponseEntity<List<LinkedAccountSummaryResponse>> getLinkedAccounts(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID ownerUserId = authenticatedUserProvider.from(jwt).id();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(linkedMemberProfileService.getLinkedAccounts(ownerUserId));
    }
}
