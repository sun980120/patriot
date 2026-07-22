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
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
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
        ReportData report = loadReportData(fiscalYearId);

        StringBuilder builder = new StringBuilder();
        builder.append('\ufeff');
        appendSummary(builder, report);
        appendIncomeRows(builder, report.incomes());
        appendExpenseRows(builder, report.expenses());
        appendMonthlyPaymentRows(builder, report.fiscalYear(), report.members(), report.paymentsByMemberMonth());
        appendAdditionalChargeRows(builder, report.memberCharges());

        return builder.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportFiscalYearXlsx(UUID fiscalYearId) {
        ReportData report = loadReportData(fiscalYearId);

        SXSSFWorkbook workbook = new SXSSFWorkbook(200);
        workbook.setCompressTempFiles(true);
        try (workbook; ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            CellStyle moneyStyle = workbook.createCellStyle();
            DataFormat dataFormat = workbook.createDataFormat();
            moneyStyle.setDataFormat(dataFormat.getFormat("#,##0"));

            writeSummarySheet(workbook, headerStyle, moneyStyle, report);
            writeIncomeSheet(workbook, headerStyle, moneyStyle, report.incomes());
            writeExpenseSheet(workbook, headerStyle, moneyStyle, report.expenses());
            writeMonthlyPaymentSheet(workbook, headerStyle, moneyStyle, report);
            writeAdditionalChargeSheet(workbook, headerStyle, moneyStyle, report.memberCharges());

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("재정 리포트 Excel 파일을 생성하지 못했습니다.", exception);
        } finally {
            workbook.dispose();
        }
    }

    private ReportData loadReportData(UUID fiscalYearId) {
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

        return new ReportData(fiscalYear, members, paymentsByMemberMonth, incomes, expenses, memberCharges);
    }

    private void appendSummary(StringBuilder builder, ReportData report) {
        builder.append("요약\n");
        builder.append("항목,값\n");
        row(builder, "연도", report.fiscalYear().getYear() + "년");
        row(builder, "대상 회원 수", report.members().size());
        row(builder, "월회비 납부 합계", report.monthlyDuesPaidTotal());
        row(builder, "기타 세입 합계", report.manualIncomeTotal());
        row(builder, "지출 합계", report.expenseTotal());
        row(builder, "추가 비용 납부 합계", report.additionalChargePaidTotal());
        row(builder, "추가 비용 미납 합계", report.additionalChargeUnpaidTotal());
        row(builder, "기타 세입 - 지출", report.manualIncomeTotal() - report.expenseTotal());
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

    private void writeSummarySheet(Workbook workbook, CellStyle headerStyle, CellStyle moneyStyle, ReportData report) {
        Sheet sheet = workbook.createSheet("요약");
        writeHeader(sheet, headerStyle, "항목", "값");
        writeSheetRow(sheet, 1, moneyStyle, "연도", report.fiscalYear().getYear() + "년");
        writeSheetRow(sheet, 2, moneyStyle, "대상 회원 수", report.members().size());
        writeSheetRow(sheet, 3, moneyStyle, "월회비 납부 합계", report.monthlyDuesPaidTotal());
        writeSheetRow(sheet, 4, moneyStyle, "기타 세입 합계", report.manualIncomeTotal());
        writeSheetRow(sheet, 5, moneyStyle, "지출 합계", report.expenseTotal());
        writeSheetRow(sheet, 6, moneyStyle, "추가 비용 납부 합계", report.additionalChargePaidTotal());
        writeSheetRow(sheet, 7, moneyStyle, "추가 비용 미납 합계", report.additionalChargeUnpaidTotal());
        writeSheetRow(sheet, 8, moneyStyle, "기타 세입 - 지출", report.manualIncomeTotal() - report.expenseTotal());
        setColumnWidths(sheet, 18, 18);
    }

    private void writeIncomeSheet(Workbook workbook, CellStyle headerStyle, CellStyle moneyStyle, List<IncomeEntry> incomes) {
        Sheet sheet = workbook.createSheet("기타 세입");
        writeHeader(sheet, headerStyle, "등록일", "항목", "금액", "메모", "추가비용이벤트ID");
        int rowIndex = 1;
        for (IncomeEntry entry : incomes) {
            writeSheetRow(
                sheet,
                rowIndex++,
                moneyStyle,
                entry.getCreatedAt(),
                entry.getLabel(),
                entry.getAmount(),
                entry.getMemo(),
                entry.getChargeGroup() == null ? null : entry.getChargeGroup().getId()
            );
        }
        setColumnWidths(sheet, 22, 24, 14, 34, 40);
    }

    private void writeExpenseSheet(Workbook workbook, CellStyle headerStyle, CellStyle moneyStyle, List<ExpenseEntry> expenses) {
        Sheet sheet = workbook.createSheet("지출");
        writeHeader(sheet, headerStyle, "등록일", "항목", "금액", "메모", "추가비용이벤트ID");
        int rowIndex = 1;
        for (ExpenseEntry entry : expenses) {
            writeSheetRow(
                sheet,
                rowIndex++,
                moneyStyle,
                entry.getCreatedAt(),
                entry.getLabel(),
                entry.getAmount(),
                entry.getMemo(),
                entry.getChargeGroup() == null ? null : entry.getChargeGroup().getId()
            );
        }
        setColumnWidths(sheet, 22, 24, 14, 34, 40);
    }

    private void writeMonthlyPaymentSheet(Workbook workbook, CellStyle headerStyle, CellStyle moneyStyle, ReportData report) {
        Sheet sheet = workbook.createSheet("월회비 현황");
        writeHeader(sheet, headerStyle, "회원명", "아이디", "월", "상태", "금액", "적용등급", "면제사유");
        int rowIndex = 1;
        for (Member member : report.members()) {
            for (Integer month : report.fiscalYear().getVisibleMonths()) {
                MembershipPayment payment = report.paymentsByMemberMonth().get(member.getId() + ":" + month);
                boolean autoExempt = payment == null && member.isExemptFor(report.fiscalYear().getYear(), month);
                String status = payment == null
                    ? (autoExempt ? "AUTO_EXEMPT" : "UNPAID")
                    : payment.isPaid()
                        ? "PAID"
                        : payment.isManualExempt() ? "MANUAL_EXEMPT" : "UNPAID";
                int amount = payment == null ? 0 : payment.getChargedAmount();
                MemberGrade grade = payment == null ? member.getMemberGrade() : payment.getAppliedGrade();
                String reason = payment == null ? (autoExempt ? "회원 회비 면제 기간" : null) : payment.getExemptionReason();

                writeSheetRow(sheet, rowIndex++, moneyStyle, member.getFullName(), member.getUsername(), month, status, amount, grade, reason);
            }
        }
        setColumnWidths(sheet, 16, 18, 10, 18, 14, 14, 34);
    }

    private void writeAdditionalChargeSheet(Workbook workbook, CellStyle headerStyle, CellStyle moneyStyle, List<MemberCharge> charges) {
        Sheet sheet = workbook.createSheet("추가 비용 청구");
        writeHeader(sheet, headerStyle, "이벤트명", "카테고리", "이벤트일", "회원명", "아이디", "상태", "금액", "기준금액", "조정사유", "납부일", "메모");
        int rowIndex = 1;
        for (MemberCharge charge : charges) {
            writeSheetRow(
                sheet,
                rowIndex++,
                moneyStyle,
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
            );
        }
        setColumnWidths(sheet, 24, 16, 16, 16, 18, 14, 14, 14, 28, 22, 34);
    }

    private void writeHeader(Sheet sheet, CellStyle headerStyle, String... values) {
        Row row = sheet.createRow(0);
        for (int index = 0; index < values.length; index++) {
            Cell cell = row.createCell(index);
            cell.setCellValue(values[index]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void writeSheetRow(Sheet sheet, int rowIndex, CellStyle moneyStyle, Object... values) {
        Row row = sheet.createRow(rowIndex);
        for (int index = 0; index < values.length; index++) {
            Cell cell = row.createCell(index);
            Object value = values[index];
            if (value instanceof Number number) {
                cell.setCellValue(number.doubleValue());
                cell.setCellStyle(moneyStyle);
            } else if (value != null) {
                cell.setCellValue(String.valueOf(value));
            }
        }
    }

    private void setColumnWidths(Sheet sheet, int... widths) {
        for (int index = 0; index < widths.length; index++) {
            sheet.setColumnWidth(index, widths[index] * 256);
        }
    }

    private record ReportData(
        FiscalYear fiscalYear,
        List<Member> members,
        Map<String, MembershipPayment> paymentsByMemberMonth,
        List<IncomeEntry> incomes,
        List<ExpenseEntry> expenses,
        List<MemberCharge> memberCharges
    ) {
        int manualIncomeTotal() {
            return incomes.stream().mapToInt(IncomeEntry::getAmount).sum();
        }

        int expenseTotal() {
            return expenses.stream().mapToInt(ExpenseEntry::getAmount).sum();
        }

        int monthlyDuesPaidTotal() {
            return paymentsByMemberMonth.values().stream()
                .filter(MembershipPayment::isPaid)
                .mapToInt(MembershipPayment::getChargedAmount)
                .sum();
        }

        int additionalChargePaidTotal() {
            return memberCharges.stream()
                .filter(charge -> charge.getStatus() == AdditionalChargeStatus.PAID)
                .mapToInt(MemberCharge::getAmount)
                .sum();
        }

        int additionalChargeUnpaidTotal() {
            return memberCharges.stream()
                .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
                .mapToInt(MemberCharge::getAmount)
                .sum();
        }
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
