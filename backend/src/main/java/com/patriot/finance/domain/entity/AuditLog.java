package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "audit_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String action;

    @Column(nullable = false, length = 80)
    private String targetType;

    @Column(length = 80)
    private String targetId;

    @Column(length = 160)
    private String targetName;

    private UUID actorId;

    @Column(length = 160)
    private String actorName;

    @Column(columnDefinition = "text")
    private String detail;

    @Builder
    private AuditLog(
        String action,
        String targetType,
        String targetId,
        String targetName,
        UUID actorId,
        String actorName,
        String detail
    ) {
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.targetName = targetName;
        this.actorId = actorId;
        this.actorName = actorName;
        this.detail = detail;
    }
}
