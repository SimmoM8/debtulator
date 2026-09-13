package com.debtulator.backend.inbox;

import com.debtulator.backend.inbox.dto.InboxRequestResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InboxServiceTest {

    @Test
    void combinesSourcesAndSortsNewestFirst() {
        UUID userId = UUID.randomUUID();

        InboxRequestSource older = source(
                InboxRequestType.MEMBER_LINK,
                response(Instant.parse("2026-09-13T10:00:00Z"))
        );
        InboxRequestSource newer = source(
                InboxRequestType.MEMBER_LINK,
                response(Instant.parse("2026-09-13T11:00:00Z"))
        );

        InboxService service = new InboxService(List.of(older, newer));

        List<InboxRequestResponse> result = service.getRequests(
                userId,
                "needs_action",
                null,
                100
        );

        assertThat(result)
                .extracting(InboxRequestResponse::updatedAt)
                .containsExactly(
                        Instant.parse("2026-09-13T11:00:00Z"),
                        Instant.parse("2026-09-13T10:00:00Z")
                );
    }

    @Test
    void rejectsUnsupportedType() {
        InboxService service = new InboxService(List.of());

        assertThatThrownBy(() -> service.getRequests(
                UUID.randomUUID(),
                "needs_action",
                List.of("unknown"),
                100
        ))
                .isInstanceOf(InboxException.class)
                .hasMessage("Unsupported inbox request type.");
    }

    @Test
    void rejectsOutOfRangeLimit() {
        InboxService service = new InboxService(List.of());

        assertThatThrownBy(() -> service.getRequests(
                UUID.randomUUID(),
                "needs_action",
                null,
                101
        ))
                .isInstanceOf(InboxException.class)
                .hasMessage("Inbox request limit must be between 1 and 100.");
    }

    private InboxRequestSource source(
            InboxRequestType type,
            InboxRequestResponse response
    ) {
        return new InboxRequestSource() {
            @Override
            public InboxRequestType type() {
                return type;
            }

            @Override
            public List<InboxRequestResponse> find(
                    UUID userId,
                    InboxRequestScope scope,
                    int limit
            ) {
                return List.of(response);
            }
        };
    }

    private InboxRequestResponse response(Instant updatedAt) {
        return new InboxRequestResponse(
                UUID.randomUUID(),
                "member_link",
                "incoming",
                "pending",
                UUID.randomUUID(),
                "Gregory Donaldson",
                updatedAt.minusSeconds(60),
                updatedAt
        );
    }
}
