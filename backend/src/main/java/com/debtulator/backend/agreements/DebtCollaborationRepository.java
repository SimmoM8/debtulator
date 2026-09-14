package com.debtulator.backend.agreements;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class DebtCollaborationRepository {

    private final JdbcTemplate jdbcTemplate;

    public Optional<DebtCollaboration> findByDebtId(UUID debtId) {
        return queryByDebtId(debtId, false);
    }

    public Optional<DebtCollaboration> findByDebtIdForUpdate(UUID debtId) {
        return queryByDebtId(debtId, true);
    }

    public Optional<DebtCollaboration> findByIdForUpdate(UUID collaborationId) {
        return jdbcTemplate.query(
                """
                select *
                from public.debt_collaborations
                where id = ?
                for update
                """,
                (resultSet, rowNumber) -> mapRow(resultSet),
                collaborationId
        ).stream().findFirst();
    }

    public void insert(DebtCollaboration collaboration) {
        jdbcTemplate.update(
                """
                insert into public.debt_collaborations (
                    id,
                    first_user_id,
                    first_debt_id,
                    second_user_id,
                    second_debt_id,
                    agreed_revision,
                    agreed_deleted,
                    agreed_debtor_user_id,
                    agreed_creditor_user_id,
                    agreed_amount,
                    agreed_currency,
                    agreed_title,
                    agreed_due_date,
                    last_agreed_request_id,
                    created_at,
                    updated_at
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                collaboration.id(),
                collaboration.firstUserId(),
                collaboration.firstDebtId(),
                collaboration.secondUserId(),
                collaboration.secondDebtId(),
                collaboration.agreedRevision(),
                collaboration.agreedDeleted(),
                collaboration.agreedDebtorUserId(),
                collaboration.agreedCreditorUserId(),
                collaboration.agreedAmount(),
                collaboration.agreedCurrency(),
                collaboration.agreedTitle(),
                collaboration.agreedDueDate(),
                collaboration.lastAgreedRequestId(),
                Timestamp.from(collaboration.createdAt()),
                Timestamp.from(collaboration.updatedAt())
        );
    }

    public void updateAgreedSnapshot(
            UUID collaborationId,
            long agreedRevision,
            boolean agreedDeleted,
            UUID debtorUserId,
            UUID creditorUserId,
            java.math.BigDecimal amount,
            String currency,
            String title,
            LocalDate dueDate,
            UUID requestId,
            Instant updatedAt
    ) {
        jdbcTemplate.update(
                """
                update public.debt_collaborations
                set agreed_revision = ?,
                    agreed_deleted = ?,
                    agreed_debtor_user_id = ?,
                    agreed_creditor_user_id = ?,
                    agreed_amount = ?,
                    agreed_currency = ?,
                    agreed_title = ?,
                    agreed_due_date = ?,
                    last_agreed_request_id = ?,
                    updated_at = ?
                where id = ?
                """,
                agreedRevision,
                agreedDeleted,
                debtorUserId,
                creditorUserId,
                amount,
                currency,
                title,
                dueDate,
                requestId,
                Timestamp.from(updatedAt),
                collaborationId
        );
    }

    private Optional<DebtCollaboration> queryByDebtId(UUID debtId, boolean forUpdate) {
        String sql = """
                select *
                from public.debt_collaborations
                where first_debt_id = ?
                   or second_debt_id = ?
                """ + (forUpdate ? " for update" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) -> mapRow(resultSet),
                debtId,
                debtId
        ).stream().findFirst();
    }

    private DebtCollaboration mapRow(ResultSet resultSet) throws SQLException {
        java.sql.Date agreedDueDate = resultSet.getDate("agreed_due_date");
        return new DebtCollaboration(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("first_user_id", UUID.class),
                resultSet.getObject("first_debt_id", UUID.class),
                resultSet.getObject("second_user_id", UUID.class),
                resultSet.getObject("second_debt_id", UUID.class),
                resultSet.getLong("agreed_revision"),
                resultSet.getBoolean("agreed_deleted"),
                resultSet.getObject("agreed_debtor_user_id", UUID.class),
                resultSet.getObject("agreed_creditor_user_id", UUID.class),
                resultSet.getBigDecimal("agreed_amount"),
                resultSet.getString("agreed_currency"),
                resultSet.getString("agreed_title"),
                agreedDueDate != null ? agreedDueDate.toLocalDate() : null,
                resultSet.getObject("last_agreed_request_id", UUID.class),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getTimestamp("updated_at").toInstant()
        );
    }
}
