package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.dto.DashboardResponse;
import com.patriot.finance.dto.FinanceEntryResponse;
import com.patriot.finance.dto.FiscalYearResponse;
import com.patriot.finance.dto.MemberSummaryResponse;
import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final String HIDDEN_EMAIL = "woosung9801@gmail.com";

    private final MemberRepository memberRepository;
    private final FiscalYearRepository fiscalYearRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final ExpenseEntryRepository expenseEntryRepository;

    public DashboardResponse load(Member currentMember) {
        List<FiscalYearResponse> fiscalYears = fiscalYearRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
        FiscalYearResponse selectedYear = fiscalYears.stream()
            .filter(FiscalYearResponse::active)
            .findFirst()
            .orElse(fiscalYears.isEmpty() ? null : fiscalYears.get(0));

        boolean admin = currentMember.getAppRole() == AppRole.ADMIN || currentMember.getAppRole() == AppRole.SUPER_ADMIN;

        List<MemberSummaryResponse> profiles = (admin ? memberRepository.findAll().stream() : List.of(currentMember).stream())
            .filter(this::isVisibleMember)
            .map(this::toResponse)
            .toList();

        List<PaymentResponse> payments = paymentRepository.findAll().stream()
            .filter(payment -> isVisibleMember(payment.getMember()))
            .map(this::toResponse)
            .toList();

        List<FinanceEntryResponse> incomes = incomeEntryRepository.findAll().stream()
            .map(this::toResponse)
            .toList();

        List<FinanceEntryResponse> expenses = expenseEntryRepository.findAll().stream()
            .map(this::toResponse)
            .toList();

        return new DashboardResponse(
            toResponse(currentMember),
            fiscalYears,
            selectedYear,
            profiles,
            payments,
            incomes,
            expenses
        );
    }

    private boolean isVisibleMember(Member member) {
        return member.getAppRole() != AppRole.SUPER_ADMIN && !HIDDEN_EMAIL.equalsIgnoreCase(member.getEmail());
    }

    private MemberSummaryResponse toResponse(Member member) {
        return new MemberSummaryResponse(
            member.getId(),
            member.getFullName(),
            member.getEmail(),
            member.getUsername(),
            member.getPhoneNumber(),
            member.getAddress(),
            member.getBirthDate(),
            member.getAppRole(),
            member.getMemberGrade(),
            member.getGradeSource(),
            member.getApprovalStatus(),
            member.isActive()
        );
    }

    private FiscalYearResponse toResponse(FiscalYear fiscalYear) {
        return new FiscalYearResponse(
            fiscalYear.getId(),
            fiscalYear.getYear(),
            fiscalYear.getVisibleMonths(),
            fiscalYear.isActive()
        );
    }

    private PaymentResponse toResponse(MembershipPayment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getFiscalYear().getId(),
            payment.getMember().getId(),
            payment.getMonth(),
            payment.isPaid(),
            payment.getChargedAmount(),
            payment.getAppliedGrade()
        );
    }

    private FinanceEntryResponse toResponse(IncomeEntry entry) {
        return new FinanceEntryResponse(
            entry.getId(),
            entry.getFiscalYear().getId(),
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getCreatedAt()
        );
    }

    private FinanceEntryResponse toResponse(ExpenseEntry entry) {
        return new FinanceEntryResponse(
            entry.getId(),
            entry.getFiscalYear().getId(),
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getCreatedAt()
        );
    }
}
