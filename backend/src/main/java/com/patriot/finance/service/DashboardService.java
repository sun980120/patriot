package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.dto.ChargeGroupResponse;
import com.patriot.finance.dto.DashboardResponse;
import com.patriot.finance.dto.FinanceEntryResponse;
import com.patriot.finance.dto.FiscalYearResponse;
import com.patriot.finance.dto.MemberSummaryResponse;
import com.patriot.finance.dto.MemberChargeResponse;
import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.repository.ChargeGroupRepository;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import com.patriot.finance.repository.MemberChargeRepository;
import com.patriot.finance.repository.MemberRepository;
import java.util.Comparator;
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
    private final ChargeGroupRepository chargeGroupRepository;
    private final MemberChargeRepository memberChargeRepository;

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
            .sorted(Comparator.comparing(Member::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder())))
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

        List<ChargeGroupResponse> chargeGroups = chargeGroupRepository.findAll().stream()
            .map(this::toChargeGroupResponse)
            .toList();

        return new DashboardResponse(
            toResponse(currentMember),
            fiscalYears,
            selectedYear,
            profiles,
            payments,
            incomes,
            expenses,
            chargeGroups
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
            member.getAddressDetail(),
            member.getBirthDate(),
            member.getAppRole(),
            member.getMemberGrade(),
            member.getGradeSource(),
            member.getApprovalStatus(),
            member.isActive(),
            member.getFeeExemptionMonths(),
            member.getFeeExemptionStartDate(),
            member.getJoinedAt()
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
            entry.getChargeGroup() != null ? entry.getChargeGroup().getId() : null,
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
            entry.getChargeGroup() != null ? entry.getChargeGroup().getId() : null,
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getCreatedAt()
        );
    }

    private ChargeGroupResponse toChargeGroupResponse(com.patriot.finance.domain.entity.ChargeGroup group) {
        List<MemberChargeResponse> participantCharges = memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream()
            .map(charge -> new MemberChargeResponse(
                charge.getId(),
                group.getId(),
                charge.getMember().getId(),
                charge.getMember().getFullName(),
                charge.getMember().getUsername(),
                charge.getAmount(),
                charge.getStatus(),
                charge.getPaidAt(),
                charge.getMemo()
            ))
            .toList();
        int participantChargeTotal = participantCharges.stream().mapToInt(MemberChargeResponse::amount).sum();
        int participantPaidTotal = participantCharges.stream()
            .filter(charge -> charge.status() == com.patriot.finance.domain.enums.AdditionalChargeStatus.PAID)
            .mapToInt(MemberChargeResponse::amount)
            .sum();
        int surplusAmount = group.getActualCost() == null
            ? 0
            : Math.max(participantPaidTotal - Math.max(group.getActualCost() - group.getSupportAmount(), 0), 0);

        return new ChargeGroupResponse(
            group.getId(),
            group.getFiscalYear().getId(),
            group.getTitle(),
            group.getCategory(),
            group.getEventDate(),
            group.getSupportAmount(),
            group.getActualCost(),
            group.isSettlementCompleted(),
            participantChargeTotal,
            participantPaidTotal,
            surplusAmount,
            group.getMemo(),
            group.getCreatedAt(),
            participantCharges
        );
    }
}
