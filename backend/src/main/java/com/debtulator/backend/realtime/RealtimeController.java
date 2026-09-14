package com.debtulator.backend.realtime;

import com.debtulator.backend.realtime.dto.RealtimeEventsResponse;
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

@RestController
@RequestMapping("/api/v1/realtime")
@RequiredArgsConstructor
public class RealtimeController {

    private final RealtimeEventService realtimeEventService;
    private final AuthenticatedUserProvider authenticatedUserProvider;

    @GetMapping("/events")
    public ResponseEntity<RealtimeEventsResponse> events(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Long after,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(realtimeEventService.poll(
                        authenticatedUserProvider.from(jwt).id(),
                        after,
                        limit
                ));
    }
}
