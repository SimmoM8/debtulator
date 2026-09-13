package com.debtulator.backend.memberlinking;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name = "member_link_requests", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberLinkRequest {
    @Id private UUID id;
    @Column(name = "requester_user_id", nullable = false) private UUID requesterUserId;
    @Column(name = "target_user_id", nullable = false) private UUID targetUserId;
    @Column(name = "requester_name", nullable = false, length = 120) private String requesterName;
    @Column(name = "target_name", nullable = false, length = 120) private String targetName;
    @Column(name = "requester_member_id") private UUID requesterMemberId;
    @Column(name = "target_member_id") private UUID targetMemberId;
    @Column(nullable = false) private String status;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "resolved_at") private Instant resolvedAt;
    @Column(name = "unlinked_at") private Instant unlinkedAt;

    public MemberLinkRequest(
            UUID id, UUID requesterUserId, UUID targetUserId,
            String requesterName, String targetName,
            UUID requesterMemberId, Instant createdAt
    ) {
        this.id = id;
        this.requesterUserId = requesterUserId;
        this.targetUserId = targetUserId;
        this.requesterName = requesterName;
        this.targetName = targetName;
        this.requesterMemberId = requesterMemberId;
        this.status = MemberLinkRequestStatus.PENDING.getValue();
        this.createdAt = createdAt;
    }

    public boolean isPending() { return MemberLinkRequestStatus.PENDING.getValue().equals(status); }
    public boolean isAccepted() { return MemberLinkRequestStatus.ACCEPTED.getValue().equals(status); }
    public boolean isRejected() { return MemberLinkRequestStatus.REJECTED.getValue().equals(status); }
    public boolean isCancelled() { return MemberLinkRequestStatus.CANCELLED.getValue().equals(status); }
    public boolean isUnlinked() { return MemberLinkRequestStatus.UNLINKED.getValue().equals(status); }

    public void accept(UUID targetMemberId, Instant resolvedAt) {
        this.targetMemberId = targetMemberId;
        this.status = MemberLinkRequestStatus.ACCEPTED.getValue();
        this.resolvedAt = resolvedAt;
    }

    public void reject(Instant resolvedAt) {
        this.status = MemberLinkRequestStatus.REJECTED.getValue();
        this.resolvedAt = resolvedAt;
    }

    public void cancel(Instant resolvedAt) {
        this.status = MemberLinkRequestStatus.CANCELLED.getValue();
        this.resolvedAt = resolvedAt;
    }

    public void unlink(Instant unlinkedAt) {
        this.status = MemberLinkRequestStatus.UNLINKED.getValue();
        this.unlinkedAt = unlinkedAt;
    }
}
