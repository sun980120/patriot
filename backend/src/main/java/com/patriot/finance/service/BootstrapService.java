package com.patriot.finance.service;

import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.repository.MemberRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BootstrapService implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.super-admin-email}")
    private String superAdminEmail;

    @Value("${app.bootstrap.super-admin-username}")
    private String superAdminUsername;

    @Value("${app.bootstrap.super-admin-password}")
    private String superAdminPassword;

    @Value("${app.bootstrap.super-admin-name}")
    private String superAdminName;

    @Override
    public void run(String... args) {
        Member superAdmin = memberRepository.findByUsername(superAdminUsername)
            .or(() -> memberRepository.findByEmail(superAdminEmail))
            .orElseGet(() -> memberRepository.save(Member.builder()
                .email(superAdminEmail)
                .username(superAdminUsername)
                .passwordHash(passwordEncoder.encode(superAdminPassword))
                .fullName(superAdminName)
                .phoneNumber("010-0000-0000")
                .address("서울")
                .birthDate(LocalDate.of(1998, 1, 20))
                .appRole(AppRole.SUPER_ADMIN)
                .memberGrade(MemberGrade.간사)
                .gradeSource(GradeSource.MANUAL)
                .approvalStatus(ApprovalStatus.APPROVED)
                .active(true)
                .build()));

        if (superAdmin.getUsername() == null || superAdmin.getUsername().isBlank()) {
            superAdmin.assignUsername(superAdminUsername);
        }

        memberRepository.findAll().forEach(member -> {
            if (member.getUsername() == null || member.getUsername().isBlank()) {
                member.assignUsername(deriveUsername(member.getEmail(), member.getId().toString()));
            }
        });
    }

    private String deriveUsername(String source, String fallback) {
        if (source == null || source.isBlank()) {
            return "user-" + fallback.substring(0, 8);
        }
        int atIndex = source.indexOf('@');
        return atIndex > 0 ? source.substring(0, atIndex) : source;
    }
}
