package com.patriot.finance.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponse(
    UUID id,
    String action,
    String targetType,
    String targetId,
    String targetName,
    UUID actorId,
    String actorName,
    String detail,
    LocalDateTime createdAt
) {
}
