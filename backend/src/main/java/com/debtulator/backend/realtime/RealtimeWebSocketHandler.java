package com.debtulator.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RealtimeWebSocketHandler extends TextWebSocketHandler {

    private static final int REPLAY_BATCH_SIZE = 100;

    private final RealtimeSessionRegistry sessionRegistry;
    private final RealtimeEventRepository eventRepository;

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
            throws Exception {
        Object userIdValue = session.getAttributes().get(
                RealtimeHandshakeInterceptor.USER_ID_ATTRIBUTE
        );
        Object resumeSequenceValue = session.getAttributes().get(
                RealtimeHandshakeInterceptor.RESUME_SEQUENCE_ATTRIBUTE
        );

        if (!(userIdValue instanceof UUID userId)
                || !(resumeSequenceValue instanceof Long resumeSequence)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        WebSocketSession safeSession =
                sessionRegistry.register(userId, session);
        replayMissedEvents(safeSession, userId, resumeSequence);
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {
        sessionRegistry.unregister(session.getId());
    }

    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception
    ) throws Exception {
        sessionRegistry.unregister(session.getId());

        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private void replayMissedEvents(
            WebSocketSession session,
            UUID userId,
            long afterSequence
    ) {
        long cursor = afterSequence;

        while (session.isOpen()) {
            List<StoredRealtimeEvent> events =
                    eventRepository.findForRecipientAfter(
                            userId,
                            cursor,
                            REPLAY_BATCH_SIZE
                    );

            if (events.isEmpty()) {
                return;
            }

            for (StoredRealtimeEvent event : events) {
                sessionRegistry.publish(session, event);
                cursor = event.sequence();
            }

            if (events.size() < REPLAY_BATCH_SIZE) {
                return;
            }
        }
    }
}
