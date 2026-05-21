package com.patriot.finance.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    MemberSummaryResponse member
) {
}
