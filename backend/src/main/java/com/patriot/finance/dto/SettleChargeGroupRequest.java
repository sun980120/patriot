package com.patriot.finance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SettleChargeGroupRequest(
    @NotNull(message = "실제 사용금액을 입력해 주세요.")
    @Min(value = 1, message = "실제 사용금액은 1원 이상이어야 합니다.")
    Integer actualCost
) {
}
