package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.ClubEventType;
import com.patriot.finance.domain.enums.ScheduleRecurrenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record ClubEventRequest(
    @NotBlank(message = "이벤트명을 입력해 주세요.")
    String title,

    @NotNull(message = "이벤트 유형을 선택해 주세요.")
    ClubEventType type,

    LocalDate eventDate,

    @NotNull(message = "시작일을 입력해 주세요.")
    LocalDate startDate,

    @NotNull(message = "종료일을 입력해 주세요.")
    LocalDate endDate,

    LocalTime startTime,
    LocalTime endTime,

    ScheduleRecurrenceType recurrenceType,
    LocalDate recurrenceUntil,

    String location,
    String memo,
    List<UUID> participantMemberIds
) {
}
