package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "members")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String address;

    private String addressDetail;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppRole appRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberGrade memberGrade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GradeSource gradeSource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalStatus approvalStatus;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @Column(nullable = false)
    private Integer feeExemptionMonths;

    private LocalDate feeExemptionStartDate;

    private Integer failedLoginAttempts;

    private Boolean accountLocked;

    private LocalDateTime accountLockedAt;

    @Builder
    private Member(
        String email,
        String username,
        String passwordHash,
        String fullName,
        String phoneNumber,
        String address,
        String addressDetail,
        LocalDate birthDate,
        AppRole appRole,
        MemberGrade memberGrade,
        GradeSource gradeSource,
        ApprovalStatus approvalStatus,
        boolean active,
        LocalDateTime joinedAt,
        Integer feeExemptionMonths,
        LocalDate feeExemptionStartDate,
        Integer failedLoginAttempts,
        Boolean accountLocked,
        LocalDateTime accountLockedAt
    ) {
        this.email = email;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.addressDetail = addressDetail;
        this.birthDate = birthDate;
        this.appRole = appRole;
        this.memberGrade = memberGrade;
        this.gradeSource = gradeSource;
        this.approvalStatus = approvalStatus;
        this.active = active;
        this.joinedAt = joinedAt != null ? joinedAt : LocalDateTime.now();
        this.feeExemptionMonths = feeExemptionMonths == null ? 0 : feeExemptionMonths;
        this.feeExemptionStartDate = feeExemptionStartDate;
        this.failedLoginAttempts = failedLoginAttempts == null ? 0 : failedLoginAttempts;
        this.accountLocked = accountLocked == null ? false : accountLocked;
        this.accountLockedAt = accountLockedAt;
    }

    public void approve() {
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.active = true;
    }

    public void reject() {
        this.approvalStatus = ApprovalStatus.REJECTED;
        this.active = false;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
        this.approvalStatus = ApprovalStatus.APPROVED;
    }

    public void promoteToAdmin() {
        this.appRole = AppRole.ADMIN;
        this.memberGrade = MemberGrade.간사;
        this.gradeSource = GradeSource.MANUAL;
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.active = true;
    }

    public void adminToPromote() {
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        this.appRole = AppRole.MEMBER;
        this.memberGrade = age >= 19 ? MemberGrade.정회원 : MemberGrade.준회원;
        this.gradeSource = GradeSource.AUTO;
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.active = true;
    }

    public void promoteToSuperAdmin() {
        this.appRole = AppRole.SUPER_ADMIN;
        this.memberGrade = MemberGrade.간사;
        this.gradeSource = GradeSource.MANUAL;
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.active = true;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isAccountLocked() {
        return Boolean.TRUE.equals(accountLocked);
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts == null ? 0 : failedLoginAttempts;
    }

    public void recordLoginFailure(int maxAttempts) {
        int nextAttempts = getFailedLoginAttempts() + 1;
        this.failedLoginAttempts = nextAttempts;

        if (nextAttempts >= maxAttempts) {
            this.accountLocked = true;
            this.accountLockedAt = LocalDateTime.now();
        }
    }

    public void resetLoginFailures() {
        this.failedLoginAttempts = 0;
        this.accountLocked = false;
        this.accountLockedAt = null;
    }

    public void updateFeeExemption(Integer months) {
        int normalized = months == null ? 0 : Math.max(months, 0);
        this.feeExemptionMonths = normalized;

        if (normalized == 0) {
            this.feeExemptionStartDate = null;
            return;
        }

        if (this.feeExemptionStartDate == null) {
            this.feeExemptionStartDate = LocalDate.now();
        }
    }

    public boolean isExemptFor(int year, int month) {
        if (this.memberGrade == MemberGrade.간사 || this.feeExemptionMonths == null || this.feeExemptionMonths <= 0 || this.feeExemptionStartDate == null) {
            return false;
        }

        int startIndex = this.feeExemptionStartDate.getYear() * 12 + this.feeExemptionStartDate.getMonthValue();
        int targetIndex = year * 12 + month;
        int diff = targetIndex - startIndex;
        return diff >= 0 && diff < this.feeExemptionMonths;
    }

    public void assignUsername(String username) {
        this.username = username;
    }

    public void updateProfile(String username, String address, String addressDetail, LocalDate birthDate, MemberGrade memberGrade) {
        this.username = username;
        this.email = username;
        this.address = address;
        this.addressDetail = addressDetail;
        this.birthDate = birthDate;

        if (this.gradeSource == GradeSource.AUTO && this.appRole == AppRole.MEMBER) {
            this.memberGrade = memberGrade;
        }
    }

    public void syncAutoGrade(MemberGrade grade) {
        if (this.gradeSource == GradeSource.AUTO && this.appRole == AppRole.MEMBER) {
            this.memberGrade = grade;
        }
    }
}
