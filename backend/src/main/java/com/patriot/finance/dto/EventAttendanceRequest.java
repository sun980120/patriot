package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.EventAttendanceStatus;
import jakarta.validation.constraints.NotNull;

public record EventAttendanceRequest(
    @NotNull(message = "출석 상태를 선택해 주세요.")
    EventAttendanceStatus attendanceStatus
) {
}
