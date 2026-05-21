package com.patriot.finance.dto;

public record UsernameAvailabilityResponse(
    boolean available,
    String message
) {
}
