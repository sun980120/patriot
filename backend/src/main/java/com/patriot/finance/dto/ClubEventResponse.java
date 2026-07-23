package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.ClubEventStatus;
import com.patriot.finance.domain.enums.ClubEventType;
import com.patriot.finance.domain.enums.ScheduleRecurrenceType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ClubEventResponse(
    UUID id,
    String title,
    ClubEventType type,
    ClubEventStatus status,
    LocalDate eventDate,
    LocalDateTime startAt,
    LocalDateTime endAt,
    ScheduleRecurrenceType recurrenceType,
    LocalDate recurrenceUntil,
    String location,
    String memo,
    LocalDateTime createdAt,
    List<EventParticipantResponse> participants
) {
}
