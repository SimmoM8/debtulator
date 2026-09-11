package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.MemberLinkRequestResponse;
import com.debtulator.backend.memberlinking.dto.MemberLinkingPreferencesResponse;
import com.debtulator.backend.members.Member;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.members.MemberServiceException;
import com.debtulator.backend.profiles.Profile;
import com.debtulator.backend.profiles.ProfileService;
import com.debtulator.backend.profiles.ProfileServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberLinkingService {

    private static final int MAX_PENDING_REQUESTS = 50;

    private final MemberLinkRequestRepository requestRepository;
    private final MemberService memberService;
    private final ProfileService profileService;
    private final MemberLinkingMapper memberLinkingMapper;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<MemberLinkRequestResponse> getIncomingRequests(
            UUID userId
    ) {
        return requestRepository
                .findPendingIncoming(
                        userId,
                        PageRequest.of(0, MAX_PENDING_REQUESTS)
                )
                .stream()
                .map(request ->
                        memberLinkingMapper.toResponse(request, userId)
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MemberLinkRequestResponse> getOutgoingRequests(
            UUID userId
    ) {
        return requestRepository
                .findPendingOutgoing(
                        userId,
                        PageRequest.of(0, MAX_PENDING_REQUESTS)
                )
                .stream()
                .map(request ->
                        memberLinkingMapper.toResponse(request, userId)
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public MemberLinkingPreferencesResponse getPreferences(
            UUID userId
    ) {
        Profile profile = profileService.get(userId);

        return new MemberLinkingPreferencesResponse(
                profile.isIncomingMemberLinkRequestsEnabled()
        );
    }

    @Transactional
    public MemberLinkingPreferencesResponse updatePreferences(
            UUID userId,
            boolean incomingMemberLinkRequestsEnabled
    ) {
        Profile profile =
                profileService.updateIncomingMemberLinkRequestsEnabled(
                        userId,
                        incomingMemberLinkRequestsEnabled
                );

        return new MemberLinkingPreferencesResponse(
                profile.isIncomingMemberLinkRequestsEnabled()
        );
    }

    @Transactional
    public MemberLinkRequestResponse createRequest(
            UUID requesterUserId,
            UUID targetUserId,
            UUID requesterMemberId,
            String requestedDisplayName,
            boolean useTargetFullName
    ) {
        if (requesterUserId.equals(targetUserId)) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.SELF_LINK,
                    "You cannot link a member to your own account."
            );
        }

        Profile requesterProfile =
                requireRequesterProfile(requesterUserId);
        Profile targetProfile =
                requireTargetProfile(targetUserId);

        String requesterProfileName = requireProfileName(
                requesterProfile,
                MemberLinkingException.Reason.REQUESTER_PROFILE_INCOMPLETE,
                "Complete your profile before sending member-link requests."
        );
        String targetProfileName = requireProfileName(
                targetProfile,
                MemberLinkingException.Reason.TARGET_PROFILE_INCOMPLETE,
                "The selected user cannot currently be linked."
        );

        if (!targetProfile.isIncomingMemberLinkRequestsEnabled()) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.TARGET_NOT_ACCEPTING_REQUESTS,
                    "The selected user is not accepting member-link requests."
            );
        }

        lockUserPair(requesterUserId, targetUserId);

        ensureNoExistingRelationship(
                requesterUserId,
                targetUserId
        );

        if (requestRepository.existsPendingBetweenUsers(
                requesterUserId,
                targetUserId
        )) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.REQUEST_ALREADY_PENDING,
                    "A member-link request is already pending between these users."
            );
        }

        Member requesterMember = prepareRequesterMember(
                requesterUserId,
                requesterMemberId,
                requestedDisplayName,
                useTargetFullName,
                targetProfileName
        );

        MemberLinkRequest request = new MemberLinkRequest(
                UUID.randomUUID(),
                requesterUserId,
                targetUserId,
                requesterProfileName,
                targetProfileName,
                requesterMember.getId(),
                Instant.now(clock)
        );

        try {
            requestRepository.saveAndFlush(request);
        } catch (DataIntegrityViolationException exception) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.REQUEST_ALREADY_PENDING,
                    "A member-link request is already pending between these users."
            );
        }

        return memberLinkingMapper.toResponse(
                request,
                requesterUserId
        );
    }

    @Transactional
    public MemberLinkRequestResponse acceptRequest(
            UUID targetUserId,
            UUID requestId,
            UUID targetMemberId,
            String requestedDisplayName,
            boolean useRequesterFullName
    ) {
        MemberLinkRequest request = requestRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(() -> new MemberLinkingException(
                        MemberLinkingException.Reason.REQUEST_NOT_FOUND,
                        "The member-link request does not exist."
                ));

        requirePending(request);

        lockUserPair(
                request.getRequesterUserId(),
                request.getTargetUserId()
        );

        ensureNoExistingRelationship(
                request.getRequesterUserId(),
                request.getTargetUserId()
        );

        String requesterProfileName = requireProfileName(
                requireRequesterProfile(request.getRequesterUserId()),
                MemberLinkingException.Reason.REQUESTER_PROFILE_INCOMPLETE,
                "The requester profile is no longer complete."
        );

        Member requesterMember = linkExistingMember(
                request.getRequesterUserId(),
                request.getRequesterMemberId(),
                request.getTargetUserId(),
                null
        );

        Member targetMember = prepareTargetMember(
                request,
                targetMemberId,
                requestedDisplayName,
                useRequesterFullName,
                requesterProfileName
        );

        request.accept(
                requesterMember.getId(),
                targetMember.getId(),
                Instant.now(clock)
        );
        requestRepository.flush();

        return memberLinkingMapper.toResponse(
                request,
                targetUserId
        );
    }

    @Transactional
    public MemberLinkRequestResponse rejectRequest(
            UUID targetUserId,
            UUID requestId
    ) {
        MemberLinkRequest request = requestRepository
                .findForTargetUpdate(requestId, targetUserId)
                .orElseThrow(() -> new MemberLinkingException(
                        MemberLinkingException.Reason.REQUEST_NOT_FOUND,
                        "The member-link request does not exist."
                ));

        requirePending(request);

        request.reject(Instant.now(clock));
        requestRepository.flush();

        return memberLinkingMapper.toResponse(
                request,
                targetUserId
        );
    }

    @Transactional
    public void cancelRequest(
            UUID requesterUserId,
            UUID requestId
    ) {
        MemberLinkRequest request = requestRepository
                .findForRequesterUpdate(requestId, requesterUserId)
                .orElseThrow(() -> new MemberLinkingException(
                        MemberLinkingException.Reason.REQUEST_NOT_FOUND,
                        "The member-link request does not exist."
                ));

        requirePending(request);

        request.cancel(Instant.now(clock));
        requestRepository.flush();
    }

    @Transactional
    public void unlink(
            UUID userId,
            UUID memberId
    ) {
        MemberLinkRequest request = requestRepository
                .findActiveForMemberUpdate(userId, memberId)
                .orElseThrow(() -> new MemberLinkingException(
                        MemberLinkingException.Reason.LINK_NOT_FOUND,
                        "The member does not have an active Debtulator link."
                ));

        if (!request.isAccepted()) {
            throw new IllegalStateException(
                    "The active member-link record is inconsistent."
            );
        }

        lockUserPair(
                request.getRequesterUserId(),
                request.getTargetUserId()
        );

        memberService.unlinkLinked(
                request.getRequesterUserId(),
                request.getRequesterMemberId(),
                request.getTargetUserId()
        );
        memberService.unlinkLinked(
                request.getTargetUserId(),
                request.getTargetMemberId(),
                request.getRequesterUserId()
        );

        request.unlink(Instant.now(clock));
        requestRepository.flush();
    }

    private Member prepareRequesterMember(
            UUID requesterUserId,
            UUID requesterMemberId,
            String requestedDisplayName,
            boolean useTargetFullName,
            String targetProfileName
    ) {
        if (requesterMemberId == null) {
            String displayName = resolveNewMemberDisplayName(
                    requestedDisplayName,
                    useTargetFullName,
                    targetProfileName,
                    "Provide a display name or choose the target user's profile name."
            );

            try {
                return memberService.create(
                        requesterUserId,
                        UUID.randomUUID(),
                        displayName,
                        Instant.now(clock)
                );
            } catch (MemberServiceException exception) {
                throw mapMemberException(
                        exception,
                        "The new member could not be created."
                );
            }
        }

        if (hasText(requestedDisplayName)) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.INVALID_NAME_SELECTION,
                    "A custom display name is only valid when creating a new member."
            );
        }

        Member member = requireAvailableMember(
                requesterUserId,
                requesterMemberId
        );

        if (!useTargetFullName) {
            return member;
        }

        try {
            return memberService.renameForLinking(
                    requesterUserId,
                    requesterMemberId,
                    targetProfileName
            );
        } catch (MemberServiceException exception) {
            throw mapMemberException(
                    exception,
                    "The selected member could not be renamed for linking."
            );
        }
    }

    private Member prepareTargetMember(
            MemberLinkRequest request,
            UUID targetMemberId,
            String requestedDisplayName,
            boolean useRequesterFullName,
            String requesterProfileName
    ) {
        if (targetMemberId == null) {
            String displayName = resolveNewMemberDisplayName(
                    requestedDisplayName,
                    useRequesterFullName,
                    requesterProfileName,
                    "Provide a display name or choose the requester's profile name."
            );

            return createLinkedMember(
                    request.getTargetUserId(),
                    displayName,
                    request.getRequesterUserId()
            );
        }

        if (hasText(requestedDisplayName)) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.INVALID_NAME_SELECTION,
                    "A custom display name is only valid when creating a new member."
            );
        }

        String replacementDisplayName = useRequesterFullName
                ? requesterProfileName
                : null;

        return linkExistingMember(
                request.getTargetUserId(),
                targetMemberId,
                request.getRequesterUserId(),
                replacementDisplayName
        );
    }

    private String resolveNewMemberDisplayName(
            String requestedDisplayName,
            boolean useProfileName,
            String profileName,
            String missingNameMessage
    ) {
        if (useProfileName) {
            if (hasText(requestedDisplayName)) {
                throw new MemberLinkingException(
                        MemberLinkingException.Reason.INVALID_NAME_SELECTION,
                        "Choose either the profile name or a custom display name, not both."
                );
            }
            return profileName;
        }

        if (!hasText(requestedDisplayName)) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.INVALID_NAME_SELECTION,
                    missingNameMessage
            );
        }

        return requestedDisplayName.trim();
    }

    private void ensureNoExistingRelationship(
            UUID firstUserId,
            UUID secondUserId
    ) {
        if (requestRepository.existsActiveBetweenUsers(
                firstUserId,
                secondUserId
        )
                || memberService.hasActiveLink(
                        firstUserId,
                        secondUserId
                )
                || memberService.hasActiveLink(
                        secondUserId,
                        firstUserId
                )) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.RELATIONSHIP_ALREADY_EXISTS,
                    "These users are already linked."
            );
        }
    }

    private Member requireAvailableMember(
            UUID ownerUserId,
            UUID memberId
    ) {
        try {
            return memberService.requireAvailableForLinking(
                    ownerUserId,
                    memberId
            );
        } catch (MemberServiceException exception) {
            throw mapMemberException(
                    exception,
                    "The selected member is not available for linking."
            );
        }
    }

    private Member linkExistingMember(
            UUID ownerUserId,
            UUID memberId,
            UUID linkedUserId,
            String replacementDisplayName
    ) {
        try {
            return memberService.linkExisting(
                    ownerUserId,
                    memberId,
                    linkedUserId,
                    replacementDisplayName
            );
        } catch (MemberServiceException exception) {
            throw mapMemberException(
                    exception,
                    "The selected member is no longer available for linking."
            );
        }
    }

    private Member createLinkedMember(
            UUID ownerUserId,
            String displayName,
            UUID linkedUserId
    ) {
        try {
            return memberService.createLinked(
                    ownerUserId,
                    UUID.randomUUID(),
                    displayName,
                    linkedUserId
            );
        } catch (MemberServiceException exception) {
            throw mapMemberException(
                    exception,
                    "A linked member could not be created."
            );
        }
    }

    private MemberLinkingException mapMemberException(
            MemberServiceException exception,
            String fallbackMessage
    ) {
        if (exception.getReason()
                == MemberServiceException.Reason.LINKED) {
            return new MemberLinkingException(
                    MemberLinkingException.Reason.MEMBER_ALREADY_LINKED,
                    "The selected member is already linked."
            );
        }

        if (exception.getReason()
                == MemberServiceException.Reason.INVALID_DISPLAY_NAME) {
            return new MemberLinkingException(
                    MemberLinkingException.Reason.INVALID_NAME_SELECTION,
                    exception.getMessage()
            );
        }

        return new MemberLinkingException(
                MemberLinkingException.Reason.MEMBER_NOT_AVAILABLE,
                fallbackMessage
        );
    }

    private Profile requireRequesterProfile(UUID userId) {
        try {
            return profileService.get(userId);
        } catch (ProfileServiceException exception) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.REQUESTER_PROFILE_INCOMPLETE,
                    "Complete your profile before sending member-link requests."
            );
        }
    }

    private Profile requireTargetProfile(UUID userId) {
        try {
            return profileService.get(userId);
        } catch (ProfileServiceException exception) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.TARGET_NOT_AVAILABLE,
                    "The selected user is not available for linking."
            );
        }
    }

    private String requireProfileName(
            Profile profile,
            MemberLinkingException.Reason reason,
            String message
    ) {
        String displayName = profile.getDisplayName();

        if (!hasText(displayName)) {
            throw new MemberLinkingException(
                    reason,
                    message
            );
        }

        return displayName.trim();
    }

    private void requirePending(MemberLinkRequest request) {
        if (!request.isPending()) {
            throw new MemberLinkingException(
                    MemberLinkingException.Reason.REQUEST_NOT_PENDING,
                    "The member-link request is no longer pending."
            );
        }
    }

    private void lockUserPair(
            UUID firstUserId,
            UUID secondUserId
    ) {
        String first = firstUserId.toString();
        String second = secondUserId.toString();
        String pairKey = first.compareTo(second) <= 0
                ? first + ":" + second
                : second + ":" + first;

        jdbcTemplate.query(
                "select pg_advisory_xact_lock(hashtextextended(?, 0))",
                statement -> statement.setString(1, pairKey),
                resultSet -> null
        );
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
