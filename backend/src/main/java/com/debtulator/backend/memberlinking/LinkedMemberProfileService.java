package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.LinkedAccountSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LinkedMemberProfileService {
    private final LinkedMemberProfileRepository linkedMemberProfileRepository;

    @Transactional(readOnly = true)
    public List<LinkedAccountSummaryResponse> getLinkedAccounts(UUID ownerUserId) {
        return linkedMemberProfileRepository.findLinkedAccounts(ownerUserId);
    }
}
