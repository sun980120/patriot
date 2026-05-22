package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.AdditionalChargeStatus;
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
@Table(name = "member_charges")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberCharge extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "charge_group_id", nullable = false)
    private ChargeGroup chargeGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdditionalChargeStatus status;

    private LocalDateTime paidAt;

    private String memo;

    @Builder
    private MemberCharge(
        ChargeGroup chargeGroup,
        Member member,
        String label,
        Integer amount,
        AdditionalChargeStatus status,
        LocalDateTime paidAt,
        String memo
    ) {
        this.chargeGroup = chargeGroup;
        this.member = member;
        this.label = label;
        this.amount = amount;
        this.status = status == null ? AdditionalChargeStatus.UNPAID : status;
        this.paidAt = paidAt;
        this.memo = memo;
    }

    public void markPaid(boolean paid) {
        this.status = paid ? AdditionalChargeStatus.PAID : AdditionalChargeStatus.UNPAID;
        this.paidAt = paid ? LocalDateTime.now() : null;
    }
}
