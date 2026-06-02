package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.NotificationType;
import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    NotificationType type,
    String title,
    String message,
    String linkUrl,
    boolean read,
    LocalDateTime createdAt,
    LocalDateTime readAt
) {
}
