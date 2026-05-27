package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.AdditionalChargeCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "charge_groups")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChargeGroup extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fiscal_year_id", nullable = false)
    private FiscalYear fiscalYear;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdditionalChargeCategory category;

    private LocalDate eventDate;

    @Column(nullable = false)
    private Integer supportAmount;

    private Integer actualCost;

    @Column(nullable = false)
    private boolean settlementCompleted;

    private String memo;

    @Builder
    private ChargeGroup(
        FiscalYear fiscalYear,
        String title,
        AdditionalChargeCategory category,
        LocalDate eventDate,
        Integer supportAmount,
        Integer actualCost,
        boolean settlementCompleted,
        String memo
    ) {
        this.fiscalYear = fiscalYear;
        this.title = title;
        this.category = category;
        this.eventDate = eventDate;
        this.supportAmount = supportAmount == null ? 0 : supportAmount;
        this.actualCost = actualCost;
        this.settlementCompleted = settlementCompleted;
        this.memo = memo;
    }

    public void completeSettlement(Integer actualCost) {
        this.actualCost = actualCost;
        this.settlementCompleted = true;
    }

    public void reopenSettlement() {
        this.settlementCompleted = false;
    }
}
