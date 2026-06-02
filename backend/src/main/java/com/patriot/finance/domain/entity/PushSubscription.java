package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "push_subscriptions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PushSubscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, unique = true, length = 1024)
    private String endpoint;

    @Column(nullable = false, length = 512)
    private String p256dh;

    @Column(nullable = false, length = 256)
    private String auth;

    @Column(length = 512)
    private String userAgent;

    @Column(nullable = false)
    private boolean active;

    private LocalDateTime lastSentAt;

    @Builder
    private PushSubscription(Member member, String endpoint, String p256dh, String auth, String userAgent, boolean active) {
        this.member = member;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.userAgent = userAgent;
        this.active = active;
    }

    public void refresh(Member member, String p256dh, String auth, String userAgent) {
        this.member = member;
        this.p256dh = p256dh;
        this.auth = auth;
        this.userAgent = userAgent;
        this.active = true;
    }

    public void markSent() {
        this.lastSentAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.active = false;
    }
}
