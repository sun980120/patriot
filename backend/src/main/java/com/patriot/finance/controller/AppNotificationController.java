package com.patriot.finance.controller;

import com.patriot.finance.dto.MessageResponse;
import com.patriot.finance.dto.NotificationListResponse;
import com.patriot.finance.security.SecurityUtils;
import com.patriot.finance.service.AppNotificationService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app-notifications")
@RequiredArgsConstructor
public class AppNotificationController {

    private final AppNotificationService notificationService;

    @GetMapping
    public NotificationListResponse list() {
        return notificationService.list(SecurityUtils.currentUser().getMember().getId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        long count = notificationService.unreadCount(SecurityUtils.currentUser().getMember().getId());
        return Map.of("unreadCount", count);
    }

    @PatchMapping("/{notificationId}/read")
    public MessageResponse markRead(@PathVariable UUID notificationId) {
        notificationService.markRead(SecurityUtils.currentUser().getMember().getId(), notificationId);
        return new MessageResponse("알림을 읽음 처리했습니다.");
    }

    @PatchMapping("/read-all")
    public MessageResponse markAllRead() {
        notificationService.markAllRead(SecurityUtils.currentUser().getMember().getId());
        return new MessageResponse("모든 알림을 읽음 처리했습니다.");
    }
}
