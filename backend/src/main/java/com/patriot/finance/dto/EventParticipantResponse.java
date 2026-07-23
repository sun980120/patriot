package com.patriot.finance.dto;

import java.util.UUID;

public record EventParticipantResponse(
    UUID memberId,
    String memberName,
    String memberUsername
) {
}
