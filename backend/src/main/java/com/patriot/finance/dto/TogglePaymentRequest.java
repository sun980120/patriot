package com.patriot.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TogglePaymentRequest(
    @NotNull UUID fiscalYearId,
    @NotNull UUID memberId,
    @Min(1) @Max(12) Integer month
) {
}
