package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.ManualPaymentExemptionRequest;
import com.patriot.finance.dto.BulkPaymentRequest;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.dto.TogglePaymentRequest;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final MembershipPaymentRepository paymentRepository;
    private final FiscalYearRepository fiscalYearRepository;
    private final MemberRepository memberRepository;
    private final AuditLogService auditLogService;

    public List<PaymentResponse> findByFiscalYear(UUID fiscalYearId) {
        return paymentRepository.findByFiscalYearId(fiscalYearId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public PaymentResponse toggle(TogglePaymentRequest request) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        Member member = paymentMember(request.memberId());

        MembershipPayment payment = paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(
                request.fiscalYearId(), request.memberId(), request.month())
            .orElseGet(() -> MembershipPayment.builder()
                .fiscalYear(fiscalYear)
                .member(member)
                .month(request.month())
                .paid(false)
                .chargedAmount(0)
                .appliedGrade(member.getMemberGrade())
                .build());

        if (request.expectedPaid() != null && request.expectedPaid() != payment.isPaid()) {
            throw new IllegalStateException("다른 관리자가 납부 상태를 변경했습니다. 최신 상태를 확인해 주세요.");
        }
        if (payment.isManualExempt()) {
            throw new IllegalArgumentException("수동 면제 처리된 달은 납부 처리할 수 없습니다.");
        }

        if (isFeeExempt(member, fiscalYear.getYear(), request.month())) {
            throw new IllegalArgumentException("회비 면제 기간에는 납부 처리할 수 없습니다.");
        }

        boolean nextPaid = !payment.isPaid();
        MemberGrade appliedGrade = member.getMemberGrade();
        int amount = feeFor(appliedGrade);
        payment.toggle(nextPaid, amount, appliedGrade);
        MembershipPayment savedPayment = paymentRepository.save(payment);
        auditLogService.record(
            nextPaid ? "MONTHLY_PAYMENT_MARKED_PAID" : "MONTHLY_PAYMENT_MARKED_UNPAID",
            "MEMBERSHIP_PAYMENT",
            savedPayment.getId(),
            member.getFullName(),
            fiscalYear.getYear() + "년 " + request.month() + "월 회비를 " + (nextPaid ? "납부 완료" : "미납") + " 처리했습니다."
        );
        return toResponse(savedPayment);
    }

    @Transactional
    public PaymentResponse updateManualExemption(ManualPaymentExemptionRequest request) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        Member member = paymentMember(request.memberId());

        MembershipPayment payment = paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(
                request.fiscalYearId(), request.memberId(), request.month())
            .orElseGet(() -> MembershipPayment.builder()
                .fiscalYear(fiscalYear)
                .member(member)
                .month(request.month())
                .paid(false)
                .chargedAmount(0)
                .appliedGrade(member.getMemberGrade())
                .build());

        if (request.exempt()) {
            if (payment.isPaid()) {
                throw new IllegalArgumentException("이미 납부 완료된 달은 먼저 납부 취소 후 면제 처리하세요.");
            }
            payment.applyManualExemption(normalizeReason(request.reason()), member.getMemberGrade());
        } else {
            payment.clearManualExemption(member.getMemberGrade());
        }

        MembershipPayment savedPayment = paymentRepository.save(payment);
        auditLogService.record(
            request.exempt() ? "MONTHLY_PAYMENT_MANUAL_EXEMPTED" : "MONTHLY_PAYMENT_MANUAL_EXEMPTION_CLEARED",
            "MEMBERSHIP_PAYMENT",
            savedPayment.getId(),
            member.getFullName(),
            fiscalYear.getYear() + "년 " + request.month() + "월 회비 수동 면제를 "
                + (request.exempt() ? "적용했습니다." : "해제했습니다.")
        );
        return toResponse(savedPayment);
    }

    @Transactional
    public List<PaymentResponse> markBulkPaid(BulkPaymentRequest request) {
        FiscalYear year = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        if (!year.getVisibleMonths().contains(request.month())) {
            throw new IllegalArgumentException("해당 연도의 회비 관리 대상 월이 아닙니다.");
        }
        YearMonth period = YearMonth.of(year.getYear(), request.month());
        if (period.isAfter(YearMonth.now(ZoneId.of("Asia/Seoul")))) {
            throw new IllegalArgumentException("예정된 월은 일괄 납부 처리할 수 없습니다.");
        }

        // All payment writers lock members in the same order, including missing payment rows.
        List<Member> members = memberRepository.findForPaymentUpdate(request.memberIds());
        if (members.size() != request.memberIds().size()) {
            throw new IllegalArgumentException("회원을 찾을 수 없습니다.");
        }
        List<FiscalYear> years = fiscalYearRepository.findAll().stream()
            .sorted(Comparator.comparing(FiscalYear::getYear)).toList();
        Map<UUID, List<MembershipPayment>> histories = paymentRepository.findByMemberIdIn(request.memberIds()).stream()
            .collect(Collectors.groupingBy(payment -> payment.getMember().getId()));
        Map<UUID, MembershipPayment> existing = histories.values().stream().flatMap(List::stream)
            .filter(payment -> payment.getFiscalYear().getId().equals(year.getId()) && payment.getMonth().equals(request.month()))
            .collect(Collectors.toMap(payment -> payment.getMember().getId(), Function.identity()));

        // Validate the complete selection before mutating any record.
        for (Member member : members) {
            if (!member.isActive() || member.getApprovalStatus() != ApprovalStatus.APPROVED || member.getMemberGrade() == MemberGrade.간사) {
                throw new IllegalArgumentException("활성 승인 회원의 회비만 일괄 처리할 수 있습니다.");
            }
            MembershipPayment payment = existing.get(member.getId());
            if (payment != null && payment.isPaid()) continue;
            if (member.getJoinedAt() != null && period.isBefore(YearMonth.from(member.getJoinedAt()))) {
                throw new IllegalArgumentException("가입 전 회비는 일괄 처리할 수 없습니다.");
            }
            if ((payment != null && payment.isManualExempt()) || isFeeExempt(member, year.getYear(), request.month(), years, histories.getOrDefault(member.getId(), List.of()))) {
                throw new IllegalArgumentException("면제된 회비는 일괄 납부 처리할 수 없습니다.");
            }
        }

        List<MembershipPayment> changed = new ArrayList<>();
        List<MembershipPayment> result = new ArrayList<>();
        for (Member member : members) {
            MembershipPayment payment = existing.get(member.getId());
            if (payment == null) {
                payment = MembershipPayment.builder().fiscalYear(year).member(member).month(request.month())
                    .paid(false).chargedAmount(0).appliedGrade(member.getMemberGrade()).build();
            }
            if (!payment.isPaid()) {
                payment.toggle(true, feeFor(member.getMemberGrade()), member.getMemberGrade());
                changed.add(payment);
            }
            result.add(payment);
        }
        paymentRepository.saveAllAndFlush(changed);
        for (MembershipPayment payment : changed) {
            auditLogService.record("MONTHLY_PAYMENT_MARKED_PAID", "MEMBERSHIP_PAYMENT", payment.getId(),
                payment.getMember().getFullName(), year.getYear() + "년 " + request.month() + "월 회비를 일괄 납부 완료 처리했습니다.");
        }
        return result.stream().map(this::toResponse).toList();
    }

    private Member paymentMember(UUID id) {
        return memberRepository.findForPaymentUpdate(List.of(id)).stream().findFirst()
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
    }

    private PaymentResponse toResponse(MembershipPayment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getFiscalYear().getId(),
            payment.getMember().getId(),
            payment.getMonth(),
            payment.isPaid(),
            payment.getChargedAmount(),
            payment.getAppliedGrade(),
            payment.isManualExempt(),
            payment.getExemptionReason()
        );
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }
        return reason.trim();
    }

    private int feeFor(MemberGrade grade) {
        return switch (grade) {
            case 정회원 -> 20_000;
            case 준회원 -> 10_000;
            case 간사 -> 0;
        };
    }

    private boolean isFeeExempt(Member member, int targetYear, int targetMonth) {
        if (
            member.getMemberGrade() == MemberGrade.간사 ||
            member.getFeeExemptionMonths() == null ||
            member.getFeeExemptionMonths() <= 0 ||
            member.getFeeExemptionStartDate() == null
        ) {
            return false;
        }

        List<FiscalYear> fiscalYears = fiscalYearRepository.findAll().stream()
            .sorted(Comparator.comparing(FiscalYear::getYear))
            .toList();
        List<MembershipPayment> memberPayments = paymentRepository.findByMemberId(member.getId());

        return isFeeExempt(member, targetYear, targetMonth, fiscalYears, memberPayments);
    }

    private boolean isFeeExempt(Member member, int targetYear, int targetMonth, List<FiscalYear> fiscalYears, List<MembershipPayment> memberPayments) {
        if (member.getMemberGrade() == MemberGrade.간사 || member.getFeeExemptionMonths() == null
            || member.getFeeExemptionMonths() <= 0 || member.getFeeExemptionStartDate() == null) return false;

        int remainingExemptions = member.getFeeExemptionMonths();

        for (FiscalYear year : fiscalYears) {
            for (Integer month : year.getVisibleMonths().stream().sorted().toList()) {
                LocalDate currentMonth = LocalDate.of(year.getYear(), month, 1);
                if (currentMonth.isBefore(member.getFeeExemptionStartDate().withDayOfMonth(1))) {
                    continue;
                }

                MembershipPayment payment = memberPayments.stream()
                    .filter(item -> item.getFiscalYear().getId().equals(year.getId()) && item.getMonth().equals(month))
                    .findFirst()
                    .orElse(null);

                if (payment != null && (payment.isPaid() || payment.isManualExempt())) {
                    if (year.getYear() == targetYear && month == targetMonth) {
                        return false;
                    }
                    continue;
                }

                if (remainingExemptions <= 0) {
                    return false;
                }

                if (year.getYear() == targetYear && month == targetMonth) {
                    return true;
                }

                remainingExemptions--;
            }
        }

        return false;
    }
}
