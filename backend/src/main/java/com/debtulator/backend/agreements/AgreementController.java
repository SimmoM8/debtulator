package com.debtulator.backend.agreements;

import com.debtulator.backend.agreements.dto.AgreementRequestResponse;
import com.debtulator.backend.agreements.dto.AgreementStateResponse;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agreements")
@RequiredArgsConstructor
public class AgreementController {
    private final AgreementService agreementService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<AgreementRequestResponse>> incoming(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.getIncoming(userId(jwt))
        );
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<AgreementRequestResponse>> outgoing(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.getOutgoing(userId(jwt))
        );
    }

    @GetMapping
    public ResponseEntity<List<AgreementRequestResponse>> agreed(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.getAgreed(userId(jwt))
        );
    }



    @GetMapping("/states")
    public ResponseEntity<List<AgreementStateResponse>> states(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.getStates(userId(jwt))
        );
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<AgreementRequestResponse> accept(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.accept(userId(jwt), requestId)
        );
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<AgreementRequestResponse> reject(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        return noStore(ResponseEntity.ok()).body(
                agreementService.reject(userId(jwt), requestId)
        );
    }

    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId
    ) {
        agreementService.cancel(userId(jwt), requestId);
        return noStore(ResponseEntity.status(org.springframework.http.HttpStatus.NO_CONTENT)).build();
    }

    private UUID userId(Jwt jwt) {
        return authenticatedUserProvider.from(jwt).id();
    }

    private ResponseEntity.BodyBuilder noStore(ResponseEntity.BodyBuilder builder) {
        return builder.cacheControl(CacheControl.noStore()).header("Pragma", "no-cache");
    }
}
