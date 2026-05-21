package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.dto.TogglePaymentRequest;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
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

        boolean nextPaid = !payment.isPaid();
        MemberGrade appliedGrade = member.getMemberGrade();
        int amount = feeFor(appliedGrade);
        payment.toggle(nextPaid, amount, appliedGrade);
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
            payment.getAppliedGrade()
        );
    }

    private int feeFor(MemberGrade grade) {
        return switch (grade) {
            case 정회원 -> 20_000;
            case 준회원 -> 10_000;
            case 간사 -> 0;
        };
    }
}
