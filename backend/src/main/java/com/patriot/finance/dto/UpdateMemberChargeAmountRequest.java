package com.patriot.finance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberChargeAmountRequest(
    @NotNull @Min(1) Integer amount,
    String adjustmentReason
) {
}
