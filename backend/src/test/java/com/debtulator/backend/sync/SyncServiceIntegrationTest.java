package com.debtulator.backend.sync;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.exceptions.SyncCursorExpiredException;
import com.debtulator.backend.sync.dto.PushSyncRequest;
import com.debtulator.backend.sync.dto.SyncMutationRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class SyncServiceIntegrationTest {

    @Autowired
    private SyncService syncService;

    @Autowired
    private SyncChangeRepository syncChangeRepository;

    @Autowired
    private SyncMutationRepository syncMutationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID ownerUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");
        jdbcTemplate.update(
                "update public.sync_metadata set retained_from_sequence = 0 where id = 1"
        );

        ownerUserId = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id) values (?)", ownerUserId);
    }

    @Test
    void appliesAndReplaysMemberMutationIdempotently() {
        UUID mutationId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        SyncMutationRequest mutation = memberCreate(mutationId, memberId, "Benjamin");

        var first = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(mutation))
        ).results().getFirst();

        var replay = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(mutation))
        ).results().getFirst();

        assertThat(first.status()).isEqualTo("applied");
        assertThat(first.version()).isZero();
        assertThat(first.replayed()).isFalse();
        assertThat(replay.status()).isEqualTo("applied");
        assertThat(replay.version()).isZero();
        assertThat(replay.replayed()).isTrue();
        assertThat(syncMutationRepository.count()).isEqualTo(1);
        assertThat(syncChangeRepository.count()).isEqualTo(1);
    }

    @Test
    void detectsStaleMemberUpdate() {
        UUID memberId = UUID.randomUUID();

        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), memberId, "Benjamin")
                ))
        );

        var update = new SyncMutationRequest(
                UUID.randomUUID(),
                "member",
                memberId,
                "upsert",
                0L,
                Map.of("displayName", "Ben")
        );

        var applied = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(update))
        ).results().getFirst();

        var stale = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(new SyncMutationRequest(
                        UUID.randomUUID(),
                        "member",
                        memberId,
                        "upsert",
                        0L,
                        Map.of("displayName", "Benny")
                )))
        ).results().getFirst();

        assertThat(applied.status()).isEqualTo("applied");
        assertThat(applied.version()).isEqualTo(1L);
        assertThat(stale.status()).isEqualTo("conflict");
        assertThat(stale.errorCode()).isEqualTo("VERSION_CONFLICT");
        assertThat(stale.version()).isEqualTo(1L);
    }

    @Test
    void pullsOnlyAuthenticatedOwnersChangesInSequenceOrder() {
        UUID otherOwner = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id) values (?)", otherOwner);

        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Alice"),
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Bob")
                ))
        );

        syncService.push(
                otherOwner,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Other")
                ))
        );

        var response = syncService.pull(ownerUserId, 0, 100);

        assertThat(response.changes()).hasSize(2);
        assertThat(response.changes())
                .extracting(change -> change.payload().get("displayName"))
                .containsExactly("Alice", "Bob");
        assertThat(Long.parseLong(response.nextCursor())).isGreaterThan(0);
    }

    @Test
    void bootstrapsCurrentMemberAndDebtSnapshots() {
        UUID memberId = UUID.randomUUID();
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), memberId, "Benjamin")
                ))
        );

        var debt = new SyncMutationRequest(
                UUID.randomUUID(),
                "debt",
                UUID.randomUUID(),
                "upsert",
                null,
                Map.of(
                        "memberId", memberId.toString(),
                        "direction", "they_owe",
                        "amount", "25.50",
                        "currency", "SEK",
                        "title", "Lunch",
                        "dueDate", "2026-09-30",
                        "createdAt", Instant.now().toString()
                )
        );

        var debtResult = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(debt))
        ).results().getFirst();

        var start = syncService.startBootstrap(ownerUserId);
        var members = syncService.bootstrap(ownerUserId, "member", null, 100);
        var debts = syncService.bootstrap(ownerUserId, "debt", null, 100);

        assertThat(debtResult.status()).isEqualTo("applied");
        assertThat(start.entityTypes()).containsExactly("member", "debt");
        assertThat(members.items()).hasSize(1);
        assertThat(debts.items()).hasSize(1);
        assertThat(debts.items().getFirst().payload().get("amount"))
                .isEqualTo("25.50");
    }


    @Test
    void rejectsServerControlledMemberFields() {
        var mutation = new SyncMutationRequest(
                UUID.randomUUID(),
                "member",
                UUID.randomUUID(),
                "upsert",
                null,
                Map.of(
                        "displayName", "Benjamin",
                        "createdAt", Instant.now().toString(),
                        "linkedUserId", UUID.randomUUID().toString()
                )
        );

        var result = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(mutation))
        ).results().getFirst();

        assertThat(result.status()).isEqualTo("rejected");
        assertThat(result.errorCode()).isEqualTo("INVALID_PAYLOAD");
        assertThat(syncChangeRepository.count()).isZero();
    }

    @Test
    void refusesToDeleteMemberWithActiveDebt() {
        UUID memberId = UUID.randomUUID();
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), memberId, "Benjamin")
                ))
        );

        var debtCreate = new SyncMutationRequest(
                UUID.randomUUID(),
                "debt",
                UUID.randomUUID(),
                "upsert",
                null,
                Map.of(
                        "memberId", memberId.toString(),
                        "direction", "they_owe",
                        "amount", "20.00",
                        "currency", "SEK",
                        "title", "Lunch",
                        "createdAt", Instant.now().toString()
                )
        );
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(debtCreate))
        );

        var deletion = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(new SyncMutationRequest(
                        UUID.randomUUID(),
                        "member",
                        memberId,
                        "delete",
                        0L,
                        null
                )))
        ).results().getFirst();

        assertThat(deletion.status()).isEqualTo("rejected");
        assertThat(deletion.errorCode()).isEqualTo("MEMBER_IN_USE");
    }

    @Test
    void rejectsMutationIdReuseWithDifferentRequest() {
        UUID mutationId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(mutationId, memberId, "Benjamin")
                ))
        );

        var reused = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(mutationId, memberId, "Different")
                ))
        ).results().getFirst();

        assertThat(reused.status()).isEqualTo("rejected");
        assertThat(reused.errorCode()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(syncMutationRepository.count()).isEqualTo(1);
        assertThat(syncChangeRepository.count()).isEqualTo(1);
    }

    @Test
    void softDeletesMemberAndEmitsDeleteChange() {
        UUID memberId = UUID.randomUUID();
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), memberId, "Benjamin")
                ))
        );

        var deleted = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(new SyncMutationRequest(
                        UUID.randomUUID(),
                        "member",
                        memberId,
                        "delete",
                        0L,
                        null
                )))
        ).results().getFirst();

        var bootstrap = syncService.bootstrap(ownerUserId, "member", null, 100);
        var changes = syncService.pull(ownerUserId, 0, 100);

        assertThat(deleted.status()).isEqualTo("applied");
        assertThat(deleted.version()).isEqualTo(1L);
        assertThat(bootstrap.items()).isEmpty();
        assertThat(changes.changes())
                .extracting(change -> change.operation())
                .containsExactly("upsert", "delete");
    }

    @Test
    void pagesPullResultsWithoutSkippingChanges() {
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Alice"),
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Bob"),
                        memberCreate(UUID.randomUUID(), UUID.randomUUID(), "Charlie")
                ))
        );

        var first = syncService.pull(ownerUserId, 0, 2);
        var second = syncService.pull(ownerUserId, Long.parseLong(first.nextCursor()), 2);

        assertThat(first.changes()).hasSize(2);
        assertThat(first.hasMore()).isTrue();
        assertThat(second.changes()).hasSize(1);
        assertThat(second.hasMore()).isFalse();
        assertThat(Long.parseLong(second.nextCursor()))
                .isGreaterThan(Long.parseLong(first.nextCursor()));
    }

    @Test
    void rejectsExpiredPullCursor() {
        jdbcTemplate.update(
                "update public.sync_metadata set retained_from_sequence = 10 where id = 1"
        );

        assertThatThrownBy(() -> syncService.pull(ownerUserId, 9, 100))
                .isInstanceOf(SyncCursorExpiredException.class);
    }

    @Test
    void softDeletesDebtAndRemovesItFromBootstrap() {
        UUID memberId = UUID.randomUUID();
        syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        memberCreate(UUID.randomUUID(), memberId, "Benjamin")
                ))
        );

        UUID debtId = UUID.randomUUID();
        var create = new SyncMutationRequest(
                UUID.randomUUID(),
                "debt",
                debtId,
                "upsert",
                null,
                Map.of(
                        "memberId", memberId.toString(),
                        "direction", "they_owe",
                        "amount", "15.00",
                        "currency", "SEK",
                        "title", "Coffee",
                        "createdAt", Instant.now().toString()
                )
        );
        var created = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(create))
        ).results().getFirst();

        var deleted = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(new SyncMutationRequest(
                        UUID.randomUUID(),
                        "debt",
                        debtId,
                        "delete",
                        created.version(),
                        null
                )))
        ).results().getFirst();

        var bootstrap = syncService.bootstrap(ownerUserId, "debt", null, 100);

        assertThat(deleted.status()).isEqualTo("applied");
        assertThat(deleted.version()).isEqualTo(1L);
        assertThat(bootstrap.items()).isEmpty();
        assertThat(syncService.pull(ownerUserId, 0, 100).changes())
                .extracting(change -> change.operation())
                .containsExactly("upsert", "upsert", "delete");
    }

    @Test
    void continuesProcessingBatchAfterBusinessRejection() {
        UUID invalidDebtId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        SyncMutationRequest invalidDebt = new SyncMutationRequest(
                UUID.randomUUID(),
                "debt",
                invalidDebtId,
                "upsert",
                null,
                Map.of(
                        "memberId", UUID.randomUUID().toString(),
                        "direction", "they_owe",
                        "amount", "10.00",
                        "currency", "SEK",
                        "title", "Invalid",
                        "createdAt", Instant.now().toString()
                )
        );

        var response = syncService.push(
                ownerUserId,
                new PushSyncRequest(List.of(
                        invalidDebt,
                        memberCreate(UUID.randomUUID(), memberId, "Valid member")
                ))
        );

        assertThat(response.results()).hasSize(2);
        assertThat(response.results().get(0).status()).isEqualTo("rejected");
        assertThat(response.results().get(1).status()).isEqualTo("applied");
    }

    private SyncMutationRequest memberCreate(
            UUID mutationId,
            UUID memberId,
            String displayName
    ) {
        return new SyncMutationRequest(
                mutationId,
                "member",
                memberId,
                "upsert",
                null,
                Map.of(
                        "displayName", displayName,
                        "createdAt", Instant.now().toString()
                )
        );
    }
}

