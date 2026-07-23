package com.patriot.finance.dto;

import java.time.LocalDate;
import java.util.UUID;

public record AuditLogSearchRequest(
    String action,
    UUID actorId,
    String targetType,
    String targetKeyword,
    LocalDate fromDate,
    LocalDate toDate,
    Integer limit
) {
}
