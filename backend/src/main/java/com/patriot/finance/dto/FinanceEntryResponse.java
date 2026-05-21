package com.patriot.finance.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record FinanceEntryResponse(
    UUID id,
    UUID fiscalYearId,
    String label,
    Integer amount,
    String memo,
    LocalDateTime createdAt
) {
}
