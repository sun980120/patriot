package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import java.time.LocalDate;
import java.util.UUID;

public record MemberSummaryResponse(
    UUID id,
    String fullName,
    String email,
    String username,
    String phoneNumber,
    String address,
    LocalDate birthDate,
    AppRole appRole,
    MemberGrade memberGrade,
    GradeSource gradeSource,
    ApprovalStatus approvalStatus,
    boolean active
) {
}
