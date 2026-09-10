package com.debtulator.backend.members;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class MemberMapper {

    public Map<String, Object> toSyncPayload(Member member) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("id", member.getId().toString());
        payload.put("ownerUserId", member.getOwnerUserId().toString());
        payload.put("displayName", member.getDisplayName());
        payload.put(
                "linkedUserId",
                member.getLinkedUserId() != null
                        ? member.getLinkedUserId().toString()
                        : null
        );
        payload.put("createdAt", member.getCreatedAt().toString());
        payload.put("updatedAt", member.getUpdatedAt().toString());
        payload.put("version", member.getVersion());

        return payload;
    }
}
