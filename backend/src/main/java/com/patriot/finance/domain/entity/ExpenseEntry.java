package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "expense_entries")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpenseEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fiscal_year_id", nullable = false)
    private FiscalYear fiscalYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "charge_group_id")
    private ChargeGroup chargeGroup;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Integer amount;

    private String memo;

    @Builder
    private ExpenseEntry(FiscalYear fiscalYear, ChargeGroup chargeGroup, String label, Integer amount, String memo) {
        this.fiscalYear = fiscalYear;
        this.chargeGroup = chargeGroup;
        this.label = label;
        this.amount = amount;
        this.memo = memo;
    }
}
