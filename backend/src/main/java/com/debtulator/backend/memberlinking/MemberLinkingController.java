package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.*;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/member-linking")
@RequiredArgsConstructor
public class MemberLinkingController {
    private final MemberLinkingService memberLinkingService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<MemberLinkRequestResponse>> getIncomingRequests(@AuthenticationPrincipal Jwt jwt) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.getIncomingRequests(userId(jwt)));
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<MemberLinkRequestResponse>> getOutgoingRequests(@AuthenticationPrincipal Jwt jwt) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.getOutgoingRequests(userId(jwt)));
    }

    @PostMapping("/requests")
    public ResponseEntity<MemberLinkRequestResponse> createRequest(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateMemberLinkRequest request
    ) {
        var response = memberLinkingService.createRequest(
                userId(jwt),
                request.requestId(),
                request.targetUserId(),
                request.memberId(),
                request.displayName(),
                request.useTargetName()
        );
        return noStore(ResponseEntity.status(HttpStatus.CREATED)).body(response);
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<MemberLinkRequestResponse> acceptRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody AcceptMemberLinkRequest request
    ) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.acceptRequest(
                userId(jwt),
                requestId,
                request.memberId(),
                request.displayName(),
                request.useRequesterName()
        ));
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<MemberLinkRequestResponse> rejectRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.rejectRequest(userId(jwt), requestId));
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> cancelRequest(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        memberLinkingService.cancelRequest(userId(jwt), requestId);
        return noStore(ResponseEntity.status(org.springframework.http.HttpStatus.NO_CONTENT)).build();
    }

    @DeleteMapping("/links/{linkId}")
    public ResponseEntity<Void> unlink(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID linkId) {
        memberLinkingService.unlink(userId(jwt), linkId);
        return noStore(ResponseEntity.status(org.springframework.http.HttpStatus.NO_CONTENT)).build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<MemberLinkingPreferencesResponse> getPreferences(@AuthenticationPrincipal Jwt jwt) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.getPreferences(userId(jwt)));
    }

    @PutMapping("/preferences")
    public ResponseEntity<MemberLinkingPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateMemberLinkingPreferencesRequest request
    ) {
        return noStore(ResponseEntity.ok()).body(memberLinkingService.updatePreferences(
                userId(jwt), request.incomingMemberLinkRequestsEnabled()
        ));
    }

    private UUID userId(Jwt jwt) { return authenticatedUserProvider.from(jwt).id(); }
    private ResponseEntity.BodyBuilder noStore(ResponseEntity.BodyBuilder builder) {
        return builder.cacheControl(CacheControl.noStore()).header("Pragma", "no-cache");
    }
}
