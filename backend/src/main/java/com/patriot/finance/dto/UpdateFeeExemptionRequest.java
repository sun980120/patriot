package com.patriot.finance.dto;

import jakarta.validation.constraints.Min;

public record UpdateFeeExemptionRequest(
    @Min(0) Integer months
) {
}
