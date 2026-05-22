package com.patriot.finance.dto;

import jakarta.validation.constraints.NotNull;

public record MemberChargeToggleRequest(
    @NotNull Boolean paid
) {
}
