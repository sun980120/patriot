package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.ClubEventStatus;
import jakarta.validation.constraints.NotNull;

public record ClubEventStatusRequest(
    @NotNull(message = "이벤트 상태를 선택해 주세요.")
    ClubEventStatus status
) {
}
