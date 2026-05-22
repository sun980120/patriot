package com.patriot.finance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SettleChargeGroupRequest(
    @NotNull @Min(0) Integer actualCost
) {
}
