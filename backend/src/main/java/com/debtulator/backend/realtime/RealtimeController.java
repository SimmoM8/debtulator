package com.debtulator.backend.realtime;

import com.debtulator.backend.realtime.dto.CreateRealtimeConnectionTicketRequest;
import com.debtulator.backend.realtime.dto.RealtimeConnectionTicketResponse;
import com.debtulator.backend.security.AuthenticatedUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/realtime")
@RequiredArgsConstructor
public class RealtimeController {

    private final RealtimeConnectionTicketService ticketService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @PostMapping("/tickets")
    public ResponseEntity<RealtimeConnectionTicketResponse> ticket(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateRealtimeConnectionTicketRequest request
    ) {
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(ticketService.issue(
                        authenticatedUserProvider.from(jwt).id(),
                        request.afterSequence()
                ));
    }
}
