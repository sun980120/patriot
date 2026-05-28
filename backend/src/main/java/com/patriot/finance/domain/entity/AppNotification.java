package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppNotification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    private String linkUrl;

    private LocalDateTime readAt;

    @Builder
    private AppNotification(Member member, NotificationType type, String title, String message, String linkUrl, LocalDateTime readAt) {
        this.member = member;
        this.type = type;
        this.title = title;
        this.message = message;
        this.linkUrl = linkUrl;
        this.readAt = readAt;
    }

    public void markRead() {
        if (this.readAt == null) {
            this.readAt = LocalDateTime.now();
        }
    }

    public boolean isRead() {
        return this.readAt != null;
    }
}
