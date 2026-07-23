package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.AdditionalChargeCategory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ChargeGroupResponse(
    UUID id,
    UUID fiscalYearId,
    UUID clubEventId,
    String clubEventTitle,
    String title,
    AdditionalChargeCategory category,
    LocalDate eventDate,
    Integer supportAmount,
    Integer actualCost,
    boolean settlementCompleted,
    Integer participantChargeTotal,
    Integer participantPaidTotal,
    Integer surplusAmount,
    String memo,
    LocalDateTime createdAt,
    List<MemberChargeResponse> participantCharges
) {
}
