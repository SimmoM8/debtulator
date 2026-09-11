package com.debtulator.backend.debts;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import com.debtulator.backend.members.Member;
import com.debtulator.backend.members.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@DataJpaTest
class DebtRepositoryTest {

    @Autowired
    private DebtRepository debtRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID ownerUserId;
    private UUID memberId;

    @BeforeEach
    void setUp() {
        ownerUserId = UUID.randomUUID();
        memberId = UUID.randomUUID();
        jdbcTemplate.update("insert into auth.users (id) values (?)", ownerUserId);

        Instant now = Instant.now();
        memberRepository.saveAndFlush(new Member(
                memberId,
                ownerUserId,
                "Benjamin",
                now,
                now
        ));
    }

    @Test
    void findsDebtByIdAndOwner() {
        Debt debt = createDebt();
        debtRepository.saveAndFlush(debt);

        assertThat(
                debtRepository.findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        debt.getId(),
                        ownerUserId
                )
        ).isPresent();
    }

    @Test
    void detectsActiveDebtForMember() {
        Debt debt = createDebt();
        debtRepository.saveAndFlush(debt);

        assertThat(
                debtRepository.existsByOwnerUserIdAndMemberIdAndDeletedAtIsNull(
                        ownerUserId,
                        memberId
                )
        ).isTrue();
    }

    @Test
    void excludesSoftDeletedDebtFromNormalQueries() {
        Debt debt = debtRepository.saveAndFlush(createDebt());
        debt.delete(Instant.now().plusSeconds(1));
        debtRepository.flush();

        assertThat(
                debtRepository.findByIdAndOwnerUserIdAndDeletedAtIsNull(
                        debt.getId(),
                        ownerUserId
                )
        ).isEmpty();
    }

    @Test
    void incrementsVersionWhenDebtChanges() {
        Debt debt = debtRepository.saveAndFlush(createDebt());
        assertThat(debt.getVersion()).isZero();

        debt.update(
                memberId,
                "you_owe",
                new BigDecimal("19.95"),
                "SEK",
                "Updated",
                LocalDate.of(2026, 10, 1),
                Instant.now().plusSeconds(1)
        );
        debtRepository.flush();

        assertThat(debt.getVersion()).isEqualTo(1L);
    }

    private Debt createDebt() {
        Instant now = Instant.now();
        return new Debt(
                UUID.randomUUID(),
                ownerUserId,
                memberId,
                "they_owe",
                new BigDecimal("25.50"),
                "SEK",
                "Lunch",
                LocalDate.of(2026, 9, 30),
                now,
                now
        );
    }
}

