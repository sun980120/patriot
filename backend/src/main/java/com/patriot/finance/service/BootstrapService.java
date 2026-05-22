package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BootstrapService implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final FiscalYearRepository fiscalYearRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final ExpenseEntryRepository expenseEntryRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.super-admin-email}")
    private String superAdminEmail;

    @Value("${app.bootstrap.super-admin-username}")
    private String superAdminUsername;

    @Value("${app.bootstrap.super-admin-password}")
    private String superAdminPassword;

    @Value("${app.bootstrap.super-admin-name}")
    private String superAdminName;

    @Value("${app.bootstrap.seed-demo-data:false}")
    private boolean seedDemoData;

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

        if (seedDemoData && shouldSeedDemoData()) {
            seedSampleData();
        }
    }

    private boolean shouldSeedDemoData() {
        long visibleMemberCount = memberRepository.findAll().stream()
            .filter(member -> member.getAppRole() != AppRole.SUPER_ADMIN)
            .count();

        return visibleMemberCount == 0 && fiscalYearRepository.count() == 0;
    }

    private void seedSampleData() {
        FiscalYear year2026 = fiscalYearRepository.save(FiscalYear.builder()
            .year(2026)
            .visibleMonths(List.of(5, 6, 7, 8, 9, 10, 11, 12))
            .active(true)
            .build());

        FiscalYear year2027 = fiscalYearRepository.save(FiscalYear.builder()
            .year(2027)
            .visibleMonths(List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12))
            .active(false)
            .build());

        List<Member> seededMembers = new ArrayList<>();
        seededMembers.add(createAdmin("남대우", "namdw", "010-1111-0001", "천안시 서북구", LocalDate.of(1993, 3, 4)));
        seededMembers.add(createAdmin("박형주", "parkhj", "010-1111-0002", "천안시 동남구", LocalDate.of(1994, 6, 18)));

        seededMembers.add(createMember("홍우성", "hongws", "010-1111-1001", "천안시 불당동", LocalDate.of(1998, 1, 20)));
        seededMembers.add(createMember("박시하", "parksh", "010-1111-1002", "천안시 쌍용동", LocalDate.of(1997, 11, 21)));
        seededMembers.add(createMember("이정현", "leejh", "010-1111-1003", "아산시 배방읍", LocalDate.of(1996, 5, 12)));
        seededMembers.add(createMember("조현민", "johm", "010-1111-1004", "천안시 두정동", LocalDate.of(1995, 9, 2)));
        seededMembers.add(createMember("김민재", "kimmj", "010-1111-1005", "천안시 청당동", LocalDate.of(1999, 7, 7)));
        seededMembers.add(createMember("김윤지", "kimyj", "010-1111-1006", "천안시 신불당", LocalDate.of(1998, 10, 30)));
        seededMembers.add(createMember("양유미", "yangym", "010-1111-1007", "아산시 탕정면", LocalDate.of(1997, 2, 14)));
        seededMembers.add(createMember("윤서현", "yoonsh", "010-1111-1008", "천안시 성성동", LocalDate.of(1998, 12, 25)));
        seededMembers.add(createMember("김하랑", "kimhr", "010-1111-1009", "천안시 성정동", LocalDate.of(2009, 7, 14)));
        seededMembers.add(createMember("임재환", "limjh", "010-1111-1010", "아산시 용화동", LocalDate.of(2008, 6, 10)));
        seededMembers.add(createMember("김성호", "kimsh1", "010-1111-1011", "천안시 백석동", LocalDate.of(2008, 8, 1)));
        seededMembers.add(createMember("김성현", "kimsh2", "010-1111-1012", "천안시 청수동", LocalDate.of(2008, 3, 18)));
        seededMembers.add(createMember("임종우", "limjw", "010-1111-1013", "아산시 모종동", LocalDate.of(2009, 1, 5)));
        seededMembers.add(createMember("김하진", "kimhj", "010-1111-1014", "천안시 직산읍", LocalDate.of(2009, 11, 9)));
        seededMembers.add(createMember("이세서", "leess", "010-1111-1015", "천안시 성환읍", LocalDate.of(2010, 4, 19)));
        seededMembers.add(createMember("박영광", "parkyg", "010-1111-1016", "아산시 음봉면", LocalDate.of(1996, 1, 1)));
        seededMembers.add(createMember("장준우", "jangjw", "010-1111-1017", "천안시 불당동", LocalDate.of(1997, 7, 17)));
        seededMembers.add(createMember("태지운", "taejw", "010-1111-1018", "천안시 봉명동", LocalDate.of(1998, 2, 2)));
        seededMembers.add(createMember("최신화", "choish", "010-1111-1019", "아산시 배방읍", LocalDate.of(2010, 4, 3)));
        seededMembers.add(createMember("오준혁", "ohjh", "010-1111-1020", "천안시 신방동", LocalDate.of(1998, 8, 8)));
        seededMembers.add(createMember("정호석", "junghs", "010-1111-1021", "천안시 다가동", LocalDate.of(1995, 3, 13)));
        seededMembers.add(createMember("문지호", "moonjh", "010-1111-1022", "아산시 탕정면", LocalDate.of(1999, 9, 22)));
        seededMembers.add(createMember("서민우", "seomw", "010-1111-1023", "천안시 목천읍", LocalDate.of(2008, 5, 16)));
        seededMembers.add(createMember("하도윤", "hady", "010-1111-1024", "천안시 성거읍", LocalDate.of(2009, 12, 8)));

        incomeEntryRepository.save(IncomeEntry.builder()
            .fiscalYear(year2026)
            .label("세일즈스포츠")
            .amount(100_000)
            .memo("임시 시드 데이터")
            .build());

        expenseEntryRepository.save(ExpenseEntry.builder()
            .fiscalYear(year2026)
            .label("4,5월 대관료")
            .amount(50_000)
            .memo("임시 시드 데이터")
            .build());

        for (Member member : seededMembers) {
            for (Integer month : year2026.getVisibleMonths()) {
                boolean paid = month == 5 && member.getMemberGrade() != MemberGrade.간사;
                paymentRepository.save(MembershipPayment.builder()
                    .fiscalYear(year2026)
                    .member(member)
                    .month(month)
                    .paid(paid)
                    .chargedAmount(paid ? feeFor(member.getMemberGrade()) : 0)
                    .appliedGrade(member.getMemberGrade())
                    .build());
            }

            for (Integer month : year2027.getVisibleMonths()) {
                paymentRepository.save(MembershipPayment.builder()
                    .fiscalYear(year2027)
                    .member(member)
                    .month(month)
                    .paid(false)
                    .chargedAmount(0)
                    .appliedGrade(member.getMemberGrade())
                    .build());
            }
        }
    }

    private Member createAdmin(String fullName, String username, String phoneNumber, String address, LocalDate birthDate) {
        return memberRepository.save(Member.builder()
            .email(username)
            .username(username)
            .passwordHash(passwordEncoder.encode("0000"))
            .fullName(fullName)
            .phoneNumber(phoneNumber)
            .address(address)
            .birthDate(birthDate)
            .appRole(AppRole.ADMIN)
            .memberGrade(MemberGrade.간사)
            .gradeSource(GradeSource.MANUAL)
            .approvalStatus(ApprovalStatus.APPROVED)
            .active(true)
            .build());
    }

    private Member createMember(String fullName, String username, String phoneNumber, String address, LocalDate birthDate) {
        MemberGrade grade = birthDate.isAfter(LocalDate.of(2007, 12, 31)) ? MemberGrade.준회원 : MemberGrade.정회원;
        return memberRepository.save(Member.builder()
            .email(username)
            .username(username)
            .passwordHash(passwordEncoder.encode("0000"))
            .fullName(fullName)
            .phoneNumber(phoneNumber)
            .address(address)
            .birthDate(birthDate)
            .appRole(AppRole.MEMBER)
            .memberGrade(grade)
            .gradeSource(GradeSource.AUTO)
            .approvalStatus(ApprovalStatus.APPROVED)
            .active(true)
            .build());
    }

    private int feeFor(MemberGrade grade) {
        return switch (grade) {
            case 정회원 -> 20_000;
            case 준회원 -> 10_000;
            case 간사 -> 0;
        };
    }

    private String deriveUsername(String source, String fallback) {
        if (source == null || source.isBlank()) {
            return "user-" + fallback.substring(0, 8);
        }
        int atIndex = source.indexOf('@');
        return atIndex > 0 ? source.substring(0, atIndex) : source;
    }
}
