package com.debtulator.backend.memberlinking;

import com.debtulator.backend.memberlinking.dto.LinkedAccountSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class LinkedMemberProfileRepository {
    private final JdbcTemplate jdbcTemplate;

    /** Returns only accounts linked to this owner by non-deleted members. */
    public List<LinkedAccountSummaryResponse> findLinkedAccounts(UUID ownerUserId) {
        return jdbcTemplate.query("""
                select distinct members.linked_user_id, profiles.username
                from public.members members
                join public.profiles profiles
                  on profiles.user_id = members.linked_user_id
                where members.owner_user_id = ?
                  and members.linked_user_id is not null
                  and members.deleted_at is null
                order by members.linked_user_id
                """,
                (resultSet, rowNumber) -> new LinkedAccountSummaryResponse(
                        resultSet.getObject("linked_user_id", UUID.class),
                        resultSet.getString("username")
                ),
                ownerUserId
        );
    }
}
