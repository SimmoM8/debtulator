package com.debtulator.backend.agreements;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AgreementRepository {

    private static final TypeReference<Map<String, Object>> MAP_TYPE =
            new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public List<AgreementRequest> supersedePendingForEntity(
            UUID requesterUserId,
            String entityType,
            UUID entityId,
            Instant resolvedAt
    ) {
        return jdbcTemplate.query("""
                update public.agreement_requests
                set status = 'superseded',
                    resolved_at = ?
                where requester_user_id = ?
                  and entity_type = ?
                  and entity_id = ?
                  and status = 'pending'
                returning *
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                timestamp(resolvedAt),
                requesterUserId,
                entityType,
                entityId
        );
    }

    public void insert(AgreementRequest request) {
        jdbcTemplate.update("""
                insert into public.agreement_requests (
                    id,
                    requester_user_id,
                    target_user_id,
                    entity_type,
                    entity_id,
                    entity_version,
                    collaboration_id,
                    base_agreed_revision,
                    action,
                    payload,
                    status,
                    created_at,
                    resolved_at
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, ?)
                """,
                request.id(),
                request.requesterUserId(),
                request.targetUserId(),
                request.entityType(),
                request.entityId(),
                request.entityVersion(),
                request.collaborationId(),
                request.baseAgreedRevision(),
                request.action(),
                writePayload(request.payload()),
                request.status(),
                timestamp(request.createdAt()),
                timestamp(request.resolvedAt())
        );
    }

    public List<AgreementRequest> findPendingIncoming(
            UUID userId,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where target_user_id = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId,
                limit
        );
    }

    public List<AgreementRequest> findPendingOutgoing(
            UUID userId,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where requester_user_id = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId,
                limit
        );
    }

    public List<AgreementRequest> findAcceptedForUser(
            UUID userId,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where status = 'accepted'
                  and (
                        requester_user_id = ?
                        or target_user_id = ?
                  )
                order by resolved_at desc, created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId,
                userId,
                limit
        );
    }

    public Optional<AgreementRequest> findForTarget(
            UUID requestId,
            UUID targetUserId
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where id = ?
                  and target_user_id = ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                requestId,
                targetUserId
        ).stream().findFirst();
    }

    public Optional<AgreementRequest> findForTargetUpdate(
            UUID requestId,
            UUID targetUserId
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where id = ?
                  and target_user_id = ?
                for update
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                requestId,
                targetUserId
        ).stream().findFirst();
    }

    public Optional<AgreementRequest> findForRequesterUpdate(
            UUID requestId,
            UUID requesterUserId
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where id = ?
                  and requester_user_id = ?
                for update
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                requestId,
                requesterUserId
        ).stream().findFirst();
    }

    public List<AgreementRequest> findPendingBetweenUsersForUpdate(
            UUID firstUserId,
            UUID secondUserId
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where status = 'pending'
                  and (
                        (
                            requester_user_id = ?
                            and target_user_id = ?
                        )
                        or
                        (
                            requester_user_id = ?
                            and target_user_id = ?
                        )
                  )
                order by created_at
                for update
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                firstUserId,
                secondUserId,
                secondUserId,
                firstUserId
        );
    }

    public Optional<AgreementRequest> findForParticipant(
            UUID requestId,
            UUID userId
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where id = ?
                  and (
                        requester_user_id = ?
                        or target_user_id = ?
                  )
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                requestId,
                userId,
                userId
        ).stream().findFirst();
    }

    public List<AgreementRequest> findPendingIncomingByEntityAndAction(
            UUID userId,
            String entityType,
            String action,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where target_user_id = ?
                  and entity_type = ?
                  and action = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId,
                entityType,
                action,
                limit
        );
    }

    public List<AgreementRequest> findPendingOutgoingByEntityAndAction(
            UUID userId,
            String entityType,
            String action,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where requester_user_id = ?
                  and entity_type = ?
                  and action = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId,
                entityType,
                action,
                limit
        );
    }

    public List<AgreementRequest> findHistoryByEntityAndAction(
            UUID userId,
            String entityType,
            String action,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where entity_type = ?
                  and action = ?
                  and status <> 'pending'
                  and (
                        requester_user_id = ?
                        or target_user_id = ?
                  )
                order by resolved_at desc nulls last, created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                entityType,
                action,
                userId,
                userId,
                limit
        );
    }

    public List<AgreementRequest> findPendingIncomingByEntity(
            UUID userId,
            String entityType,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where target_user_id = ?
                  and entity_type = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId, entityType, limit
        );
    }

    public List<AgreementRequest> findPendingOutgoingByEntity(
            UUID userId,
            String entityType,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where requester_user_id = ?
                  and entity_type = ?
                  and status = 'pending'
                order by created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                userId, entityType, limit
        );
    }

    public List<AgreementRequest> findHistoryByEntity(
            UUID userId,
            String entityType,
            int limit
    ) {
        return jdbcTemplate.query("""
                select *
                from public.agreement_requests
                where entity_type = ?
                  and status <> 'pending'
                  and (requester_user_id = ? or target_user_id = ?)
                order by resolved_at desc nulls last, created_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                entityType, userId, userId, limit
        );
    }

    public List<AgreementRequest> supersedePendingForCollaboration(
            UUID collaborationId,
            UUID exceptRequestId,
            Instant resolvedAt
    ) {
        return jdbcTemplate.query("""
                update public.agreement_requests
                set status = 'superseded',
                    resolved_at = ?
                where collaboration_id = ?
                  and id <> ?
                  and status = 'pending'
                returning *
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                timestamp(resolvedAt), collaborationId, exceptRequestId
        );
    }

    public Optional<UUID> findLinkedMemberId(UUID ownerUserId, UUID linkedUserId) {
        return jdbcTemplate.query("""
                select id
                from public.members
                where owner_user_id = ?
                  and linked_user_id = ?
                  and deleted_at is null
                limit 1
                """,
                (resultSet, rowNumber) -> resultSet.getObject("id", UUID.class),
                ownerUserId, linkedUserId
        ).stream().findFirst();
    }

    public void attachCollaborationToRequest(UUID requestId, UUID collaborationId) {
        jdbcTemplate.update("""
                update public.agreement_requests
                set collaboration_id = ?
                where id = ?
                """,
                collaborationId, requestId
        );
    }

    public String profileLabel(UUID userId) {
        return jdbcTemplate.query("""
                select name, username
                from public.profiles
                where user_id = ?
                """,
                (resultSet, rowNumber) -> {
                    String name = resultSet.getString("name");
                    if (name != null && !name.isBlank()) return name;
                    String username = resultSet.getString("username");
                    return username != null && !username.isBlank()
                            ? "@" + username
                            : "Debtulator user";
                },
                userId
        ).stream().findFirst().orElse("Debtulator user");
    }

    public void updateDebtProjection(
            UUID ownerUserId,
            UUID debtId,
            String status,
            UUID collaborationId,
            Long agreedRevision
    ) {
        jdbcTemplate.update("""
                update public.debts
                set agreement_status = ?,
                    collaboration_id = ?,
                    agreed_revision = ?
                where owner_user_id = ?
                  and id = ?
                """,
                status, collaborationId, agreedRevision, ownerUserId, debtId
        );
    }

    public void updateStatus(
            UUID requestId,
            String status,
            Instant resolvedAt
    ) {
        jdbcTemplate.update("""
                update public.agreement_requests
                set status = ?,
                    resolved_at = ?
                where id = ?
                """,
                status,
                timestamp(resolvedAt),
                requestId
        );
    }

    public void upsertState(
            UUID ownerUserId,
            String entityType,
            UUID entityId,
            long entityVersion,
            String status,
            UUID latestRequestId,
            UUID collaborationId,
            Long agreedRevision,
            Instant updatedAt
    ) {
        jdbcTemplate.update("""
                insert into public.agreement_entity_states (
                    owner_user_id, entity_type, entity_id, entity_version, status,
                    latest_request_id, collaboration_id, agreed_revision, updated_at
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (owner_user_id, entity_type, entity_id) do update
                set entity_version = excluded.entity_version,
                    status = excluded.status,
                    latest_request_id = excluded.latest_request_id,
                    collaboration_id = excluded.collaboration_id,
                    agreed_revision = excluded.agreed_revision,
                    updated_at = excluded.updated_at
                """,
                ownerUserId, entityType, entityId, entityVersion, status,
                latestRequestId, collaborationId, agreedRevision, timestamp(updatedAt)
        );
    }

    public void upsertState(
            UUID ownerUserId,
            String entityType,
            UUID entityId,
            long entityVersion,
            String status,
            UUID latestRequestId,
            Instant updatedAt
    ) {
        upsertState(ownerUserId, entityType, entityId, entityVersion, status,
                latestRequestId, null, null, updatedAt);
    }

    public void updateStateIfLatest(
            UUID ownerUserId,
            String entityType,
            UUID entityId,
            UUID requestId,
            String status,
            Instant updatedAt
    ) {
        jdbcTemplate.update("""
                update public.agreement_entity_states
                set status = ?,
                    updated_at = ?
                where owner_user_id = ?
                  and entity_type = ?
                  and entity_id = ?
                  and latest_request_id = ?
                """,
                status,
                timestamp(updatedAt),
                ownerUserId,
                entityType,
                entityId,
                requestId
        );
    }

    public void clearStateIfLatest(
            UUID ownerUserId,
            String entityType,
            UUID entityId,
            UUID requestId,
            long entityVersion,
            Instant updatedAt
    ) {
        jdbcTemplate.update("""
                update public.agreement_entity_states
                set entity_version = ?,
                    status = 'private',
                    latest_request_id = null,
                    updated_at = ?
                where owner_user_id = ?
                  and entity_type = ?
                  and entity_id = ?
                  and latest_request_id = ?
                """,
                entityVersion,
                timestamp(updatedAt),
                ownerUserId,
                entityType,
                entityId,
                requestId
        );
    }

    public List<AgreementState> findStatesForOwner(
            UUID ownerUserId,
            int limit
    ) {
        return jdbcTemplate.query("""
                select
                    owner_user_id,
                    entity_type,
                    entity_id,
                    entity_version,
                    status,
                    latest_request_id,
                    collaboration_id,
                    agreed_revision,
                    updated_at
                from public.agreement_entity_states
                where owner_user_id = ?
                order by updated_at desc
                limit ?
                """,
                (resultSet, rowNumber) -> new AgreementState(
                        resultSet.getObject(
                                "owner_user_id",
                                UUID.class
                        ),
                        resultSet.getString("entity_type"),
                        resultSet.getObject(
                                "entity_id",
                                UUID.class
                        ),
                        resultSet.getLong("entity_version"),
                        resultSet.getString("status"),
                        resultSet.getObject(
                                "latest_request_id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "collaboration_id",
                                UUID.class
                        ),
                        resultSet.getObject("agreed_revision", Long.class),
                        resultSet.getTimestamp(
                                "updated_at"
                        ).toInstant()
                ),
                ownerUserId,
                limit
        );
    }

    private AgreementRequest mapRow(
            java.sql.ResultSet resultSet
    ) throws java.sql.SQLException {
        String payloadJson = resultSet.getString("payload");

        Timestamp resolvedAt =
                resultSet.getTimestamp("resolved_at");

        return new AgreementRequest(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "requester_user_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "target_user_id",
                        UUID.class
                ),
                resultSet.getString("entity_type"),
                resultSet.getObject(
                        "entity_id",
                        UUID.class
                ),
                resultSet.getLong("entity_version"),
                resultSet.getObject("collaboration_id", UUID.class),
                resultSet.getObject("base_agreed_revision", Long.class),
                resultSet.getString("action"),
                payloadJson == null
                        ? Map.of()
                        : readPayload(payloadJson),
                resultSet.getString("status"),
                resultSet.getTimestamp(
                        "created_at"
                ).toInstant(),
                resolvedAt != null
                        ? resolvedAt.toInstant()
                        : null
        );
    }

    private Timestamp timestamp(Instant instant) {
        return instant != null
                ? Timestamp.from(instant)
                : null;
    }

    private String writePayload(
            Map<String, Object> payload
    ) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not serialize agreement payload.",
                    exception
            );
        }
    }

    private Map<String, Object> readPayload(
            String payload
    ) {
        try {
            return objectMapper.readValue(
                    payload,
                    MAP_TYPE
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Could not deserialize agreement payload.",
                    exception
            );
        }
    }

    public record AgreementState(
            UUID ownerUserId,
            String entityType,
            UUID entityId,
            long entityVersion,
            String status,
            UUID latestRequestId,
            UUID collaborationId,
            Long agreedRevision,
            Instant updatedAt
    ) {
    }
}
