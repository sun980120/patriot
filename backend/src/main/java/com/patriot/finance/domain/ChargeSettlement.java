package com.patriot.finance.domain;

public record ChargeSettlement(
    int actualCost, int appliedSupport, int participantExpense, int surplus,
    int clubExpense, int clubIncome, int extraClubExpense
) {
    public static ChargeSettlement calculate(int plannedSupport, int paidTotal, int actualCost) {
        if (plannedSupport < 0 || paidTotal < 0 || actualCost < 0) {
            throw new IllegalArgumentException("정산 금액은 음수일 수 없습니다.");
        }
        int appliedSupport = Math.min(plannedSupport, actualCost);
        int participantExpense = actualCost - appliedSupport;
        int clubExpense = Math.max(actualCost - paidTotal, 0);
        return new ChargeSettlement(actualCost, appliedSupport, participantExpense,
            Math.max(paidTotal - participantExpense, 0), clubExpense,
            Math.max(paidTotal - actualCost, 0), Math.max(clubExpense - plannedSupport, 0));
    }
}
