package com.patriot.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record FiscalYearRequest(
    @Min(2026) @Max(2100) Integer year
) {
}
