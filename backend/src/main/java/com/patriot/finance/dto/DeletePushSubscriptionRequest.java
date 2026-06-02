package com.patriot.finance.dto;

import jakarta.validation.constraints.NotBlank;

public record DeletePushSubscriptionRequest(@NotBlank String endpoint) {
}
