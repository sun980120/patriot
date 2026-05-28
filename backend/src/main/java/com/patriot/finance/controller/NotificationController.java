package com.patriot.finance.controller;

import com.patriot.finance.dto.DeletePushSubscriptionRequest;
import com.patriot.finance.dto.MessageResponse;
import com.patriot.finance.dto.PushSendResponse;
import com.patriot.finance.dto.PushSubscriptionRequest;
import com.patriot.finance.dto.VapidPublicKeyResponse;
import com.patriot.finance.security.SecurityUtils;
import com.patriot.finance.service.PushNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final PushNotificationService pushNotificationService;

    @GetMapping("/vapid-public-key")
    public VapidPublicKeyResponse publicKey() {
        return pushNotificationService.publicKey();
    }

    @PostMapping("/subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse saveSubscription(@Valid @RequestBody PushSubscriptionRequest request) {
        pushNotificationService.saveSubscription(SecurityUtils.currentUser().getMember().getId(), request);
        return new MessageResponse("알림 구독이 저장되었습니다.");
    }

    @DeleteMapping("/subscriptions")
    public MessageResponse deleteSubscription(@Valid @RequestBody DeletePushSubscriptionRequest request) {
        pushNotificationService.deleteSubscription(request.endpoint());
        return new MessageResponse("알림 구독이 해제되었습니다.");
    }

    @PostMapping("/test")
    public PushSendResponse sendTest() {
        return pushNotificationService.sendTest(SecurityUtils.currentUser().getMember().getId());
    }

    @PostMapping("/monthly-dues/remind")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public PushSendResponse sendMonthlyDuesReminder() {
        return pushNotificationService.sendMonthlyDuesReminder();
    }
}
