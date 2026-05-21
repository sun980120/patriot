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

    @Builder
    private Member(
        String email,
        String username,
        String passwordHash,
        String fullName,
        String phoneNumber,
        String address,
        LocalDate birthDate,
        AppRole appRole,
        MemberGrade memberGrade,
        GradeSource gradeSource,
        ApprovalStatus approvalStatus,
        boolean active,
        LocalDateTime joinedAt
    ) {
        this.email = email;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.birthDate = birthDate;
        this.appRole = appRole;
        this.memberGrade = memberGrade;
        this.gradeSource = gradeSource;
        this.approvalStatus = approvalStatus;
        this.active = active;
        this.joinedAt = joinedAt != null ? joinedAt : LocalDateTime.now();
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

    public void assignUsername(String username) {
        this.username = username;
    }

    public void updateProfile(String username, String address, LocalDate birthDate, MemberGrade memberGrade) {
        this.username = username;
        this.email = username;
        this.address = address;
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
