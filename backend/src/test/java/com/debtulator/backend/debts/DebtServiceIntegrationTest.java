package com.debtulator.backend.debts;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.members.MemberService;
import com.debtulator.backend.sync.SyncChangeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class DebtServiceIntegrationTest {

    @Autowired
    private DebtService debtService;

    @Autowired
    private MemberService memberService;

    @Autowired
    private SyncChangeRepository syncChangeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID ownerUserId;
    private UUID memberId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("delete from public.sync_mutations");
        jdbcTemplate.update("delete from public.sync_changes");
        jdbcTemplate.update("delete from public.debts");
        jdbcTemplate.update("delete from public.members");
        jdbcTemplate.update("delete from auth.users");

        ownerUserId = UUID.randomUUID();
        memberId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                ownerUserId
        );

        memberService.create(
                ownerUserId,
                memberId,
                "Benjamin",
                Instant.now()
        );

        syncChangeRepository.deleteAll();
    }

    @Test
    void createsDebtAndRecordsSyncChange() {
        UUID debtId = UUID.randomUUID();

        Debt debt = debtService.create(
                ownerUserId,
                debtId,
                memberId,
                "they_owe",
                new BigDecimal("25.50"),
                " sek ",
                "Lunch",
                LocalDate.of(2026, 9, 30),
                Instant.now()
        );

        assertThat(debt.getId()).isEqualTo(debtId);
        assertThat(debt.getCurrency()).isEqualTo("SEK");
        assertThat(debt.getVersion()).isZero();

        var changes = syncChangeRepository.findAll();
        assertThat(changes).hasSize(1);
        assertThat(changes.getFirst().getEntityType()).isEqualTo("debt");
        assertThat(changes.getFirst().getOperation()).isEqualTo("upsert");
        assertThat(changes.getFirst().getPayload().get("amount"))
                .isEqualTo("25.50");
    }

    @Test
    void updatesDebtAndRejectsStaleVersion() {
        UUID debtId = UUID.randomUUID();

        Debt created = debtService.create(
                ownerUserId,
                debtId,
                memberId,
                "they_owe",
                new BigDecimal("25.50"),
                "SEK",
                "Lunch",
                null,
                Instant.now()
        );

        Debt updated = debtService.update(
                ownerUserId,
                debtId,
                created.getVersion(),
                memberId,
                "you_owe",
                new BigDecimal("30.00"),
                "SEK",
                "Dinner",
                LocalDate.of(2026, 10, 1)
        );

        assertThat(updated.getVersion()).isEqualTo(1L);
        assertThat(updated.getDirection()).isEqualTo("you_owe");
        assertThat(updated.getAmount()).isEqualByComparingTo("30.00");
        assertThat(syncChangeRepository.count()).isEqualTo(2);

        assertThatThrownBy(() -> debtService.update(
                ownerUserId,
                debtId,
                0L,
                memberId,
                "they_owe",
                new BigDecimal("40.00"),
                "SEK",
                "Stale",
                null
        ))
                .isInstanceOfSatisfying(
                        DebtServiceException.class,
                        exception -> {
                            assertThat(exception.getReason())
                                    .isEqualTo(
                                            DebtServiceException.Reason.VERSION_CONFLICT
                                    );
                            assertThat(exception.getCurrentVersion())
                                    .isEqualTo(1L);
                        }
                );

        assertThat(syncChangeRepository.count()).isEqualTo(2);
    }

    @Test
    void rejectsAmountThatCannotFitNumericColumn() {
        assertThatThrownBy(() -> debtService.create(
                ownerUserId,
                UUID.randomUUID(),
                memberId,
                "they_owe",
                new BigDecimal("100000000000000000.00"),
                "SEK",
                "Too large",
                null,
                Instant.now()
        ))
                .isInstanceOfSatisfying(
                        DebtServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        DebtServiceException.Reason.INVALID_AMOUNT
                                )
                );

        assertThat(syncChangeRepository.count()).isZero();
    }

    @Test
    void refusesDebtForAnotherUsersMember() {
        UUID otherOwnerUserId = UUID.randomUUID();
        UUID otherMemberId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into auth.users (id) values (?)",
                otherOwnerUserId
        );

        memberService.create(
                otherOwnerUserId,
                otherMemberId,
                "Other",
                Instant.now()
        );

        syncChangeRepository.deleteAll();

        assertThatThrownBy(() -> debtService.create(
                ownerUserId,
                UUID.randomUUID(),
                otherMemberId,
                "they_owe",
                new BigDecimal("10.00"),
                "SEK",
                "Invalid member",
                null,
                Instant.now()
        ))
                .isInstanceOfSatisfying(
                        DebtServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        DebtServiceException.Reason.MEMBER_NOT_FOUND
                                )
                );

        assertThat(syncChangeRepository.count()).isZero();
    }
}
