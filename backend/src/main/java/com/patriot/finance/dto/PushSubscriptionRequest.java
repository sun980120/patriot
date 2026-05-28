package com.patriot.finance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PushSubscriptionRequest(
    @NotBlank String endpoint,
    @Valid @NotNull PushSubscriptionKeys keys,
    String userAgent
) {
    public record PushSubscriptionKeys(
        @NotBlank String p256dh,
        @NotBlank String auth
    ) {
    }
}
