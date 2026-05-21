package com.patriot.finance.dto;

import java.util.List;
import java.util.UUID;

public record FiscalYearResponse(
    UUID id,
    Integer year,
    List<Integer> visibleMonths,
    boolean active
) {
}
