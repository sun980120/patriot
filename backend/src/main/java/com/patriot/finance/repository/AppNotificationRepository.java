package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.AppNotification;
import com.patriot.finance.domain.enums.NotificationType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppNotificationRepository extends JpaRepository<AppNotification, UUID> {
    List<AppNotification> findTop30ByMemberIdOrderByCreatedAtDesc(UUID memberId);

    long countByMemberIdAndReadAtIsNull(UUID memberId);

    List<AppNotification> findByMemberIdAndReadAtIsNull(UUID memberId);

    boolean existsByMemberIdAndTypeAndTitleAndMessageAndReadAtIsNull(UUID memberId, NotificationType type, String title, String message);

    long deleteByMemberId(UUID memberId);

    long deleteByCreatedAtBefore(LocalDateTime createdAt);
}
