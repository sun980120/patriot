package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.ClubEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ClubEventRequest(
    @NotBlank(message = "이벤트명을 입력해 주세요.")
    String title,

    @NotNull(message = "이벤트 유형을 선택해 주세요.")
    ClubEventType type,

    @NotNull(message = "이벤트 일자를 입력해 주세요.")
    LocalDate eventDate,

    String location,
    String memo,
    List<UUID> participantMemberIds
) {
}
