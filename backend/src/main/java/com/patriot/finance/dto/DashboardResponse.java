package com.patriot.finance.dto;

import java.util.List;

public record DashboardResponse(
    MemberSummaryResponse profile,
    List<FiscalYearResponse> fiscalYears,
    FiscalYearResponse selectedYear,
    List<MemberSummaryResponse> profiles,
    List<PaymentResponse> payments,
    List<FinanceEntryResponse> incomes,
    List<FinanceEntryResponse> expenses,
    List<ChargeGroupResponse> chargeGroups
) {
}
