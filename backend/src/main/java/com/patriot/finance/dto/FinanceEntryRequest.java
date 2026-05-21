package com.patriot.finance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record FinanceEntryRequest(
    @NotNull UUID fiscalYearId,
    @NotBlank String label,
    @Min(1) Integer amount,
    String memo
) {
}
