package com.debtulator.backend.members;

import com.debtulator.backend.debts.DebtRepository;
import com.debtulator.backend.sync.SyncChangeCommand;
import com.debtulator.backend.sync.SyncChangeWriter;
import com.debtulator.backend.sync.SyncEntityType;
import com.debtulator.backend.sync.SyncOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(noRollbackFor = MemberServiceException.class)
public class MemberService {

    private final MemberRepository memberRepository;
    private final DebtRepository debtRepository;
    private final MemberMapper memberMapper;
    private final SyncChangeWriter syncChangeWriter;
    private final Clock clock;

    public Member create(
            UUID ownerUserId,
            UUID memberId,
            String displayName,
            Instant createdAt
    ) {
        String normalizedName = normalizeDisplayName(displayName);

        if (memberRepository.existsById(memberId)) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.ALREADY_EXISTS,
                    null,
                    "The member already exists."
            );
        }

        Instant now = Instant.now(clock);
        Member member = new Member(
                memberId,
                ownerUserId,
                normalizedName,
                createdAt,
                now
        );

        memberRepository.saveAndFlush(member);
        recordUpsert(ownerUserId, member);

        return member;
    }

    public Member rename(
            UUID ownerUserId,
            UUID memberId,
            long expectedVersion,
            String displayName
    ) {
        String normalizedName = normalizeDisplayName(displayName);
        Member member = requireExisting(ownerUserId, memberId);

        if (!member.getVersion().equals(expectedVersion)) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.VERSION_CONFLICT,
                    member.getVersion(),
                    "The member has changed since this device last synchronized."
            );
        }

        member.rename(normalizedName, Instant.now(clock));
        memberRepository.flush();
        recordUpsert(ownerUserId, member);

        return member;
    }

    public Long delete(
            UUID ownerUserId,
            UUID memberId,
            long expectedVersion
    ) {
        Member member = memberRepository
                .findForUpdate(memberId, ownerUserId)
                .orElse(null);

        if (member == null) {
            return null;
        }

        if (member.getDeletedAt() != null) {
            return member.getVersion();
        }

        if (!member.getVersion().equals(expectedVersion)) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.VERSION_CONFLICT,
                    member.getVersion(),
                    "The member has changed since this device last synchronized."
            );
        }

        if (member.getLinkedUserId() != null) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.LINKED,
                    member.getVersion(),
                    "A linked member cannot be removed through personal ledger sync."
            );
        }

        if (debtRepository.existsByOwnerUserIdAndMemberIdAndDeletedAtIsNull(
                ownerUserId,
                memberId
        )) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.IN_USE,
                    member.getVersion(),
                    "The member has active debts and cannot be removed."
            );
        }

        Instant now = Instant.now(clock);
        member.delete(now);
        memberRepository.flush();

        syncChangeWriter.record(
                ownerUserId,
                List.of(new SyncChangeCommand(
                        SyncEntityType.MEMBER,
                        member.getId(),
                        SyncOperation.DELETE,
                        null
                ))
        );

        return member.getVersion();
    }

    private Member requireExisting(UUID ownerUserId, UUID memberId) {
        Member member = memberRepository
                .findForUpdate(memberId, ownerUserId)
                .orElseThrow(() -> new MemberServiceException(
                        MemberServiceException.Reason.NOT_FOUND,
                        null,
                        "The member no longer exists."
                ));

        if (member.getDeletedAt() != null) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.DELETED,
                    member.getVersion(),
                    "The member has been deleted."
            );
        }

        return member;
    }

    private String normalizeDisplayName(String displayName) {
        String normalized = displayName == null
                ? ""
                : displayName.trim();

        if (normalized.isEmpty()
                || normalized.codePointCount(0, normalized.length()) > 120) {
            throw new MemberServiceException(
                    MemberServiceException.Reason.INVALID_DISPLAY_NAME,
                    null,
                    "displayName must contain between 1 and 120 characters."
            );
        }

        return normalized;
    }

    private void recordUpsert(UUID ownerUserId, Member member) {
        syncChangeWriter.record(
                ownerUserId,
                List.of(new SyncChangeCommand(
                        SyncEntityType.MEMBER,
                        member.getId(),
                        SyncOperation.UPSERT,
                        memberMapper.toSyncPayload(member)
                ))
        );
    }
}
