package com.patriot.finance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.notifications.scheduler-enabled", havingValue = "true")
public class MonthlyDuesNotificationScheduler {

    private final PushNotificationService pushNotificationService;

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    public void sendMonthlyDuesReminder() {
        var result = pushNotificationService.sendMonthlyDuesReminder();
        log.info("Monthly dues push reminder finished. targets={}, sent={}, failed={}, message={}",
            result.targetCount(), result.sentCount(), result.failedCount(), result.message());
    }

    @Scheduled(cron = "0 10 9 * * *", zone = "Asia/Seoul")
    public void sendAdditionalChargeDeadlineReminder() {
        var result = pushNotificationService.sendAdditionalChargeDeadlineReminders();
        log.info("Additional charge deadline reminder finished. targets={}, sent={}, failed={}, message={}",
            result.targetCount(), result.sentCount(), result.failedCount(), result.message());
    }
}
