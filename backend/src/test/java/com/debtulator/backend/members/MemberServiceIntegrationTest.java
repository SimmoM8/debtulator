package com.debtulator.backend.members;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.debts.DebtService;
import com.debtulator.backend.sync.SyncChangeRepository;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class MemberServiceIntegrationTest {

        @Autowired
        private MemberService memberService;

        @Autowired
        private DebtService debtService;

        @Autowired
        private SyncChangeRepository syncChangeRepository;

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

                ownerUserId = UUID.randomUUID();
                jdbcTemplate.update(
                                "insert into auth.users (id) values (?)",
                                ownerUserId);
        }

        @Test
        void createsMemberAndRecordsSyncChange() {
                UUID memberId = UUID.randomUUID();
                Instant createdAt = Instant.now().minusSeconds(30);

                Member member = memberService.create(
                                ownerUserId,
                                memberId,
                                "  Benjamin  ",
                                createdAt);

                assertThat(member.getId()).isEqualTo(memberId);
                assertThat(member.getOwnerUserId()).isEqualTo(ownerUserId);
                assertThat(member.getDisplayName()).isEqualTo("Benjamin");
                assertThat(member.getVersion()).isZero();

                var changes = syncChangeRepository.findAll();
                assertThat(changes).hasSize(1);
                assertThat(changes.getFirst().getEntityType()).isEqualTo("member");
                assertThat(changes.getFirst().getEntityId()).isEqualTo(memberId);
                assertThat(changes.getFirst().getOperation()).isEqualTo("upsert");
                assertThat(changes.getFirst().getPayload().get("displayName"))
                                .isEqualTo("Benjamin");
                assertThat(changes.getFirst().getPayload().get("version"))
                        .isInstanceOfSatisfying(
                                Number.class,
                                version -> assertThat(version.longValue()).isZero()
                        );
        }

        @Test
        void renamesMemberAndRejectsStaleVersion() {
                UUID memberId = UUID.randomUUID();

                Member created = memberService.create(
                                ownerUserId,
                                memberId,
                                "Benjamin",
                                Instant.now());

                Member renamed = memberService.rename(
                                ownerUserId,
                                memberId,
                                created.getVersion(),
                                "Ben");

                assertThat(renamed.getDisplayName()).isEqualTo("Ben");
                assertThat(renamed.getVersion()).isEqualTo(1L);
                assertThat(syncChangeRepository.count()).isEqualTo(2);

                assertThatThrownBy(() -> memberService.rename(
                                ownerUserId,
                                memberId,
                                0L,
                                "Benny"))
                                .isInstanceOfSatisfying(
                                                MemberServiceException.class,
                                                exception -> {
                                                        assertThat(exception.getReason())
                                                                        .isEqualTo(
                                                                                        MemberServiceException.Reason.VERSION_CONFLICT);
                                                        assertThat(exception.getCurrentVersion())
                                                                        .isEqualTo(1L);
                                                });

                assertThat(syncChangeRepository.count()).isEqualTo(2);
        }

        @Test
        void refusesToDeleteMemberWithActiveDebt() {
                UUID memberId = UUID.randomUUID();

                Member member = memberService.create(
                                ownerUserId,
                                memberId,
                                "Benjamin",
                                Instant.now());

                debtService.create(
                                ownerUserId,
                                UUID.randomUUID(),
                                memberId,
                                "they_owe",
                                new BigDecimal("25.50"),
                                "SEK",
                                "Lunch",
                                LocalDate.of(2026, 9, 30),
                                Instant.now());

                assertThatThrownBy(() -> memberService.delete(
                                ownerUserId,
                                memberId,
                                member.getVersion()))
                                .isInstanceOfSatisfying(
                                                MemberServiceException.class,
                                                exception -> assertThat(exception.getReason())
                                                                .isEqualTo(MemberServiceException.Reason.IN_USE));

                assertThat(syncChangeRepository.count()).isEqualTo(2);
        }
}
