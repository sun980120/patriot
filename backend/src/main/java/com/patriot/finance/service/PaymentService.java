package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.ManualPaymentExemptionRequest;
import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.dto.TogglePaymentRequest;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.time.LocalDate;
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

    public List<PaymentResponse> findByFiscalYear(UUID fiscalYearId) {
        return paymentRepository.findByFiscalYearId(fiscalYearId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public PaymentResponse toggle(TogglePaymentRequest request) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        Member member = memberRepository.findById(request.memberId())
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

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
        return toResponse(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse updateManualExemption(ManualPaymentExemptionRequest request) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        Member member = memberRepository.findById(request.memberId())
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

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

        return toResponse(paymentRepository.save(payment));
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

        int remainingExemptions = member.getFeeExemptionMonths();

        for (FiscalYear year : fiscalYears) {
            for (Integer month : year.getVisibleMonths()) {
                LocalDate currentMonth = LocalDate.of(year.getYear(), month, 1);
                if (currentMonth.isBefore(member.getFeeExemptionStartDate().withDayOfMonth(1))) {
                    continue;
                }

                MembershipPayment payment = memberPayments.stream()
                    .filter(item -> item.getFiscalYear().getId().equals(year.getId()) && item.getMonth().equals(month))
                    .findFirst()
                    .orElse(null);

                if (payment != null && payment.isPaid()) {
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
