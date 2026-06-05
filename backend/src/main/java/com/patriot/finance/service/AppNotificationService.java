package com.patriot.finance.service;

import com.patriot.finance.domain.entity.AppNotification;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.NotificationType;
import com.patriot.finance.dto.NotificationListResponse;
import com.patriot.finance.dto.NotificationResponse;
import com.patriot.finance.repository.AppNotificationRepository;
import com.patriot.finance.repository.MemberRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppNotificationService {

    private final AppNotificationRepository notificationRepository;
    private final MemberRepository memberRepository;

    public NotificationListResponse list(UUID memberId) {
        List<NotificationResponse> notifications = notificationRepository.findTop30ByMemberIdOrderByCreatedAtDesc(memberId).stream()
            .map(this::toResponse)
            .toList();
        long unreadCount = notificationRepository.countByMemberIdAndReadAtIsNull(memberId);
        return new NotificationListResponse(unreadCount, notifications);
    }

    public long unreadCount(UUID memberId) {
        return notificationRepository.countByMemberIdAndReadAtIsNull(memberId);
    }

    @Transactional
    public void create(UUID memberId, NotificationType type, String title, String message, String linkUrl) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
        notificationRepository.save(AppNotification.builder()
            .member(member)
            .type(type)
            .title(title)
            .message(message)
            .linkUrl(linkUrl)
            .build());
    }

    @Transactional
    public boolean createUnreadIfAbsent(UUID memberId, NotificationType type, String title, String message, String linkUrl) {
        if (notificationRepository.existsByMemberIdAndTypeAndTitleAndMessageAndReadAtIsNull(memberId, type, title, message)) {
            return false;
        }
        create(memberId, type, title, message, linkUrl);
        return true;
    }

    @Transactional
    public void markRead(UUID memberId, UUID notificationId) {
        AppNotification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));
        if (!notification.getMember().getId().equals(memberId)) {
            throw new IllegalArgumentException("알림을 처리할 권한이 없습니다.");
        }
        notification.markRead();
    }

    @Transactional
    public void markAllRead(UUID memberId) {
        notificationRepository.findByMemberIdAndReadAtIsNull(memberId).forEach(AppNotification::markRead);
    }

    @Transactional
    public void delete(UUID memberId, UUID notificationId) {
        AppNotification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));
        if (!notification.getMember().getId().equals(memberId)) {
            throw new IllegalArgumentException("알림을 삭제할 권한이 없습니다.");
        }
        notificationRepository.delete(notification);
    }

    @Transactional
    public long deleteAll(UUID memberId) {
        return notificationRepository.deleteByMemberId(memberId);
    }

    @Scheduled(cron = "0 20 3 * * *", zone = "Asia/Seoul")
    @Transactional
    public void deleteExpiredNotifications() {
        long deletedCount = notificationRepository.deleteByCreatedAtBefore(LocalDateTime.now().minusDays(30));
        if (deletedCount > 0) {
            log.info("Deleted expired app notifications. count={}", deletedCount);
        }
    }

    private NotificationResponse toResponse(AppNotification notification) {
        return new NotificationResponse(
            notification.getId(),
            notification.getType(),
            notification.getTitle(),
            notification.getMessage(),
            notification.getLinkUrl(),
            notification.isRead(),
            notification.getCreatedAt(),
            notification.getReadAt()
        );
    }
}
