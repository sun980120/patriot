package com.patriot.finance.dto;

import java.util.List;

public record NotificationListResponse(
    long unreadCount,
    List<NotificationResponse> notifications
) {
}
