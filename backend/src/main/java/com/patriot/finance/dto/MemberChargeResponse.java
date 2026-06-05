package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.AdditionalChargeStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record MemberChargeResponse(
    UUID id,
    UUID chargeGroupId,
    UUID memberId,
    String memberName,
    String memberUsername,
    Integer amount,
    Integer baseAmount,
    String adjustmentReason,
    AdditionalChargeStatus status,
    LocalDateTime paidAt,
    String memo
) {
}
