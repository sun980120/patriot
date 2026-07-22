package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MemberCharge;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.AdditionalChargeStatus;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import com.patriot.finance.repository.MemberChargeRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceReportService {

    private static final String HIDDEN_EMAIL = "woosung9801@gmail.com";

    private final FiscalYearRepository fiscalYearRepository;
    private final MemberRepository memberRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final ExpenseEntryRepository expenseEntryRepository;
    private final MemberChargeRepository memberChargeRepository;

    public byte[] exportFiscalYearCsv(UUID fiscalYearId) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(fiscalYearId)
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));

        List<Member> members = memberRepository.findAll().stream()
            .filter(this::isVisibleApprovedMember)
            .sorted(Comparator.comparing(Member::getFullName))
            .toList();
        Map<String, MembershipPayment> paymentsByMemberMonth = paymentRepository.findByFiscalYearId(fiscalYearId).stream()
            .collect(Collectors.toMap(payment -> payment.getMember().getId() + ":" + payment.getMonth(), Function.identity()));
        List<IncomeEntry> incomes = incomeEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(fiscalYearId);
        List<ExpenseEntry> expenses = expenseEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(fiscalYearId);
        List<MemberCharge> memberCharges = memberChargeRepository.findByChargeGroupFiscalYearIdOrderByCreatedAtDesc(fiscalYearId);

        int manualIncomeTotal = incomes.stream().mapToInt(IncomeEntry::getAmount).sum();
        int expenseTotal = expenses.stream().mapToInt(ExpenseEntry::getAmount).sum();
        int monthlyDuesPaidTotal = paymentsByMemberMonth.values().stream()
            .filter(MembershipPayment::isPaid)
            .mapToInt(MembershipPayment::getChargedAmount)
            .sum();
        int additionalChargePaidTotal = memberCharges.stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.PAID)
            .mapToInt(MemberCharge::getAmount)
            .sum();
        int additionalChargeUnpaidTotal = memberCharges.stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
            .mapToInt(MemberCharge::getAmount)
            .sum();

        StringBuilder builder = new StringBuilder();
        builder.append('\ufeff');
        appendSummary(builder, fiscalYear, members.size(), monthlyDuesPaidTotal, manualIncomeTotal, expenseTotal, additionalChargePaidTotal, additionalChargeUnpaidTotal);
        appendIncomeRows(builder, incomes);
        appendExpenseRows(builder, expenses);
        appendMonthlyPaymentRows(builder, fiscalYear, members, paymentsByMemberMonth);
        appendAdditionalChargeRows(builder, memberCharges);

        return builder.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendSummary(
        StringBuilder builder,
        FiscalYear fiscalYear,
        int memberCount,
        int monthlyDuesPaidTotal,
        int manualIncomeTotal,
        int expenseTotal,
        int additionalChargePaidTotal,
        int additionalChargeUnpaidTotal
    ) {
        builder.append("요약\n");
        builder.append("항목,값\n");
        row(builder, "연도", fiscalYear.getYear() + "년");
        row(builder, "대상 회원 수", memberCount);
        row(builder, "월회비 납부 합계", monthlyDuesPaidTotal);
        row(builder, "기타 세입 합계", manualIncomeTotal);
        row(builder, "지출 합계", expenseTotal);
        row(builder, "추가 비용 납부 합계", additionalChargePaidTotal);
        row(builder, "추가 비용 미납 합계", additionalChargeUnpaidTotal);
        row(builder, "기타 세입 - 지출", manualIncomeTotal - expenseTotal);
        builder.append('\n');
    }

    private void appendIncomeRows(StringBuilder builder, List<IncomeEntry> incomes) {
        builder.append("기타 세입\n");
        builder.append("등록일,항목,금액,메모,추가비용이벤트ID\n");
        incomes.forEach(entry -> row(
            builder,
            entry.getCreatedAt(),
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getChargeGroup() == null ? null : entry.getChargeGroup().getId()
        ));
        builder.append('\n');
    }

    private void appendExpenseRows(StringBuilder builder, List<ExpenseEntry> expenses) {
        builder.append("지출\n");
        builder.append("등록일,항목,금액,메모,추가비용이벤트ID\n");
        expenses.forEach(entry -> row(
            builder,
            entry.getCreatedAt(),
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getChargeGroup() == null ? null : entry.getChargeGroup().getId()
        ));
        builder.append('\n');
    }

    private void appendMonthlyPaymentRows(
        StringBuilder builder,
        FiscalYear fiscalYear,
        List<Member> members,
        Map<String, MembershipPayment> paymentsByMemberMonth
    ) {
        builder.append("월회비 현황\n");
        builder.append("회원명,아이디,월,상태,금액,적용등급,면제사유\n");
        for (Member member : members) {
            for (Integer month : fiscalYear.getVisibleMonths()) {
                MembershipPayment payment = paymentsByMemberMonth.get(member.getId() + ":" + month);
                boolean autoExempt = payment == null && member.isExemptFor(fiscalYear.getYear(), month);
                String status = payment == null
                    ? (autoExempt ? "AUTO_EXEMPT" : "UNPAID")
                    : payment.isPaid()
                        ? "PAID"
                        : payment.isManualExempt() ? "MANUAL_EXEMPT" : "UNPAID";
                int amount = payment == null ? 0 : payment.getChargedAmount();
                MemberGrade grade = payment == null ? member.getMemberGrade() : payment.getAppliedGrade();
                String reason = payment == null ? (autoExempt ? "회원 회비 면제 기간" : null) : payment.getExemptionReason();

                row(builder, member.getFullName(), member.getUsername(), month, status, amount, grade, reason);
            }
        }
        builder.append('\n');
    }

    private void appendAdditionalChargeRows(StringBuilder builder, List<MemberCharge> charges) {
        builder.append("추가 비용 청구\n");
        builder.append("이벤트명,카테고리,이벤트일,회원명,아이디,상태,금액,기준금액,조정사유,납부일,메모\n");
        charges.forEach(charge -> row(
            builder,
            charge.getChargeGroup().getTitle(),
            charge.getChargeGroup().getCategory(),
            charge.getChargeGroup().getEventDate(),
            charge.getMember().getFullName(),
            charge.getMember().getUsername(),
            charge.getStatus(),
            charge.getAmount(),
            charge.getBaseAmountOrAmount(),
            charge.getAdjustmentReason(),
            charge.getPaidAt(),
            charge.getMemo()
        ));
        builder.append('\n');
    }

    private boolean isVisibleApprovedMember(Member member) {
        return member.getApprovalStatus() == ApprovalStatus.APPROVED
            && member.getAppRole() != AppRole.SUPER_ADMIN
            && !HIDDEN_EMAIL.equalsIgnoreCase(member.getEmail());
    }

    private void row(StringBuilder builder, Object... values) {
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(csv(values[index]));
        }
        builder.append('\n');
    }

    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"").replace("\r", " ").replace("\n", " ") + "\"";
    }
}
