package com.patriot.finance.dto;

import java.util.UUID;

public record AuditLogActorResponse(
    UUID actorId,
    String actorName
) {
}
