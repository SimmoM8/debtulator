package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeSessionRegistry {

    private static final int SEND_TIME_LIMIT_MS = 10_000;
    private static final int SEND_BUFFER_LIMIT_BYTES = 64 * 1024;

    private final ObjectMapper objectMapper;

    private final ConcurrentMap<UUID, ConcurrentMap<String, WebSocketSession>>
            sessionsByUser = new ConcurrentHashMap<>();

    private final ConcurrentMap<String, UUID> userBySession =
            new ConcurrentHashMap<>();

    public WebSocketSession register(UUID userId, WebSocketSession session) {
        WebSocketSession safeSession = new ConcurrentWebSocketSessionDecorator(
                session,
                SEND_TIME_LIMIT_MS,
                SEND_BUFFER_LIMIT_BYTES
        );

        sessionsByUser
                .computeIfAbsent(userId, ignored -> new ConcurrentHashMap<>())
                .put(session.getId(), safeSession);

        userBySession.put(session.getId(), userId);
        return safeSession;
    }

    public void unregister(String sessionId) {
        UUID userId = userBySession.remove(sessionId);

        if (userId == null) {
            return;
        }

        ConcurrentMap<String, WebSocketSession> sessions =
                sessionsByUser.get(userId);

        if (sessions == null) {
            return;
        }

        sessions.remove(sessionId);

        if (sessions.isEmpty()) {
            sessionsByUser.remove(userId, sessions);
        }
    }

    public void publish(StoredRealtimeEvent event) {
        ConcurrentMap<String, WebSocketSession> sessions =
                sessionsByUser.get(event.recipientUserId());

        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        String payload = serializeEvent(event);

        for (WebSocketSession session : sessions.values()) {
            send(session, payload);
        }
    }

    public void publish(WebSocketSession session, StoredRealtimeEvent event) {
        send(session, serializeEvent(event));
    }

    public void keepAlive() {
        if (userBySession.isEmpty()) {
            return;
        }

        String payload = serialize(Map.of(
                "type", "realtime.keepalive",
                "occurredAt", Instant.now()
        ));

        for (ConcurrentMap<String, WebSocketSession> sessions :
                sessionsByUser.values()) {
            for (WebSocketSession session : sessions.values()) {
                send(session, payload);
            }
        }
    }

    private String serializeEvent(StoredRealtimeEvent event) {
        return serialize(Map.of(
                "sequence", Long.toString(event.sequence()),
                "id", event.id(),
                "type", event.type(),
                "payload", event.payload(),
                "occurredAt", event.occurredAt()
        ));
    }

    private void send(WebSocketSession session, String payload) {
        if (!session.isOpen()) {
            unregister(session.getId());
            return;
        }

        try {
            session.sendMessage(new TextMessage(payload));
        } catch (IOException | RuntimeException exception) {
            log.debug(
                    "Realtime WebSocket send failed for session {}",
                    session.getId(),
                    exception
            );
            unregister(session.getId());

            try {
                session.close();
            } catch (IOException ignored) {
            }
        }
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not serialize realtime WebSocket message.",
                    exception
            );
        }
    }
}
