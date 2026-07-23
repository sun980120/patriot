package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.EventAttendanceStatus;
import java.util.UUID;

public record EventParticipantResponse(
    UUID memberId,
    String memberName,
    String memberUsername,
    EventAttendanceStatus attendanceStatus
) {
}
