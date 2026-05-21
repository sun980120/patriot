package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.MemberGrade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "membership_payments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_payment_year_member_month", columnNames = {"fiscal_year_id", "member_id", "month"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MembershipPayment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fiscal_year_id", nullable = false)
    private FiscalYear fiscalYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(nullable = false)
    private boolean paid;

    @Column(nullable = false)
    private Integer chargedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberGrade appliedGrade;

    @Builder
    private MembershipPayment(FiscalYear fiscalYear, Member member, Integer month, boolean paid, Integer chargedAmount, MemberGrade appliedGrade) {
        this.fiscalYear = fiscalYear;
        this.member = member;
        this.month = month;
        this.paid = paid;
        this.chargedAmount = chargedAmount;
        this.appliedGrade = appliedGrade;
    }

    public void toggle(boolean nextPaid, int amount, MemberGrade grade) {
        this.paid = nextPaid;
        this.chargedAmount = nextPaid ? amount : 0;
        this.appliedGrade = grade;
    }
}
