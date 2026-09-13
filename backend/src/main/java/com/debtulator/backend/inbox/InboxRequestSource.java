package com.debtulator.backend.inbox;

import com.debtulator.backend.inbox.dto.InboxRequestResponse;

import java.util.List;
import java.util.UUID;

public interface InboxRequestSource {

    InboxRequestType type();

    List<InboxRequestResponse> find(
            UUID userId,
            InboxRequestScope scope,
            int limit
    );
}
