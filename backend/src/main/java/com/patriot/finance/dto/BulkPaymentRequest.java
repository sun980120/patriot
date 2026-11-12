package com.patriot.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public record BulkPaymentRequest(
    @NotNull UUID fiscalYearId,
    @NotNull @Min(1) @Max(12) Integer month,
    @NotEmpty @Size(max = 200) Set<@NotNull UUID> memberIds
) {}
