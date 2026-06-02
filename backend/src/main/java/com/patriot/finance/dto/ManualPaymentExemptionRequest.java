package com.patriot.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ManualPaymentExemptionRequest(
    @NotNull UUID fiscalYearId,
    @NotNull UUID memberId,
    @NotNull
    @Min(1) @Max(12) Integer month,
    boolean exempt,
    String reason
) {
}
