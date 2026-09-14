package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RealtimeHandshakeInterceptor implements HandshakeInterceptor {

    static final String USER_ID_ATTRIBUTE = "realtimeUserId";
    static final String RESUME_SEQUENCE_ATTRIBUTE = "realtimeResumeSequence";

    private final RealtimeConnectionTicketService ticketService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String value = UriComponentsBuilder
                .fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst("ticket");

        if (value == null) {
            return false;
        }

        UUID ticket;

        try {
            ticket = UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }

        return ticketService.consume(ticket)
                .map(connectionTicket -> {
                    attributes.put(
                            USER_ID_ATTRIBUTE,
                            connectionTicket.userId()
                    );
                    attributes.put(
                            RESUME_SEQUENCE_ATTRIBUTE,
                            connectionTicket.resumeAfterSequence()
                    );
                    return true;
                })
                .orElse(false);
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }
}
