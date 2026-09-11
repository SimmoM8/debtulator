package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.AcceptMemberLinkRequest;
import com.debtulator.backend.memberlinking.dto.CreateMemberLinkRequest;
import com.debtulator.backend.memberlinking.dto.MemberLinkRequestResponse;
import com.debtulator.backend.memberlinking.dto.MemberLinkingPreferencesResponse;
import com.debtulator.backend.memberlinking.dto.UpdateMemberLinkingPreferencesRequest;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/member-linking")
@RequiredArgsConstructor
public class MemberLinkingController {

    private final MemberLinkingService memberLinkingService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<MemberLinkRequestResponse>> getIncomingRequests(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.getIncomingRequests(userId)
        );
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<MemberLinkRequestResponse>> getOutgoingRequests(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.getOutgoingRequests(userId)
        );
    }

    @PostMapping("/requests")
    public ResponseEntity<MemberLinkRequestResponse> createRequest(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateMemberLinkRequest request
    ) {
        UUID userId = userId(jwt);

        MemberLinkRequestResponse response =
                memberLinkingService.createRequest(
                        userId,
                        request.targetUserId(),
                        request.memberId(),
                        request.displayName(),
                        request.useTargetFullName()
                );

        return noStore(
                ResponseEntity.status(HttpStatus.CREATED)
        ).body(response);
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<MemberLinkRequestResponse> acceptRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody AcceptMemberLinkRequest request
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.acceptRequest(
                        userId,
                        requestId,
                        request.memberId(),
                        request.displayName(),
                        request.useRequesterFullName()
                )
        );
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<MemberLinkRequestResponse> rejectRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.rejectRequest(
                        userId,
                        requestId
                )
        );
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> cancelRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        UUID userId = userId(jwt);

        memberLinkingService.cancelRequest(
                userId,
                requestId
        );

        return noStore(
                ResponseEntity.status(HttpStatus.NO_CONTENT)
        ).build();
    }

    @DeleteMapping("/links/{memberId}")
    public ResponseEntity<Void> unlink(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID memberId
    ) {
        UUID userId = userId(jwt);

        memberLinkingService.unlink(
                userId,
                memberId
        );

        return noStore(
                ResponseEntity.status(HttpStatus.NO_CONTENT)
        ).build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<MemberLinkingPreferencesResponse> getPreferences(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.getPreferences(userId)
        );
    }

    @PutMapping("/preferences")
    public ResponseEntity<MemberLinkingPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateMemberLinkingPreferencesRequest request
    ) {
        UUID userId = userId(jwt);

        return noStore(ResponseEntity.ok()).body(
                memberLinkingService.updatePreferences(
                        userId,
                        request.incomingMemberLinkRequestsEnabled()
                )
        );
    }

    private UUID userId(Jwt jwt) {
        return authenticatedUserProvider.from(jwt).id();
    }

    private ResponseEntity.BodyBuilder noStore(
            ResponseEntity.BodyBuilder builder
    ) {
        return builder
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache");
    }
}
