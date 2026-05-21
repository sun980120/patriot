package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.MemberGrade;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID fiscalYearId,
    UUID memberId,
    Integer month,
    boolean paid,
    Integer chargedAmount,
    MemberGrade appliedGrade
) {
}
