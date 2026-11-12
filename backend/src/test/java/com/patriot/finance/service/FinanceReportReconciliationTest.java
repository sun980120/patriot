package com.patriot.finance.service;

import com.patriot.finance.domain.entity.*;
import com.patriot.finance.domain.enums.*;
import com.patriot.finance.repository.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinanceReportReconciliationTest {
    @Mock FiscalYearRepository fiscalYearRepository;
    @Mock MemberRepository memberRepository;
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock IncomeEntryRepository incomeEntryRepository;
    @Mock ExpenseEntryRepository expenseEntryRepository;
    @Mock MemberChargeRepository memberChargeRepository;
    @InjectMocks FinanceReportService service;
    FiscalYear year;

    @BeforeEach
    void setup() {
        year = FiscalYear.builder().year(2026).visibleMonths(List.of(5)).build();
        ReflectionTestUtils.setField(year, "id", UUID.randomUUID());
        Member member = Member.builder().fullName("회원").email("sample@example.test").appRole(AppRole.MEMBER).memberGrade(MemberGrade.정회원).approvalStatus(ApprovalStatus.APPROVED).active(true).build();
        ReflectionTestUtils.setField(member, "id", UUID.randomUUID());
        ChargeGroup group = ChargeGroup.builder().fiscalYear(year).title("대회").category(AdditionalChargeCategory.TOURNAMENT_FEE).supportAmount(200000).actualCost(100000).settlementCompleted(true).build();
        ReflectionTestUtils.setField(group, "id", UUID.randomUUID());
        MembershipPayment payment = MembershipPayment.builder().fiscalYear(year).member(member).month(5).paid(true).chargedAmount(20000).appliedGrade(MemberGrade.정회원).build();
        MemberCharge charge = MemberCharge.builder().chargeGroup(group).member(member).amount(60000).status(AdditionalChargeStatus.PAID).build();
        when(fiscalYearRepository.findById(year.getId())).thenReturn(Optional.of(year));
        when(memberRepository.findAll()).thenReturn(List.of(member));
        when(paymentRepository.findByFiscalYearId(year.getId())).thenReturn(List.of(payment));
        when(memberChargeRepository.findByChargeGroupFiscalYearIdOrderByCreatedAtDesc(year.getId())).thenReturn(List.of(charge));
        when(incomeEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(year.getId())).thenReturn(List.of(
            IncomeEntry.builder().fiscalYear(year).label("후원").amount(400000).build(),
            IncomeEntry.builder().fiscalYear(year).chargeGroup(group).label("정산 잔액 참고").amount(60000).build()));
        when(expenseEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(year.getId())).thenReturn(List.of(ExpenseEntry.builder().fiscalYear(year).chargeGroup(group).label("실제 지출").amount(100000).build()));
    }

    @Test
    void csvUsesGrossReceiptsAndSeparatesSettlementReference() {
        String csv = new String(service.exportFiscalYearCsv(year.getId()), StandardCharsets.UTF_8);
        assertThat(csv).contains("\"기타 세입 합계\",\"400000\"", "\"총 세입\",\"480000\"", "\"연도 증감\",\"380000\"");
        assertThat(csv).contains("정산 참고 금액(총세입 제외)", "정산 잔액 참고");
    }

    @Test
    void excelUsesTheSameTotalsAndSeparateReferenceSheet() throws Exception {
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(service.exportFiscalYearXlsx(year.getId())))) {
            assertThat(value(workbook.getSheet("요약"), "총 세입")).isEqualTo(480000);
            assertThat(value(workbook.getSheet("요약"), "지출 합계")).isEqualTo(100000);
            assertThat(value(workbook.getSheet("요약"), "연도 증감")).isEqualTo(380000);
            assertThat(workbook.getSheet("기타 세입").getLastRowNum()).isEqualTo(1);
            assertThat(workbook.getSheet("정산 참고").getLastRowNum()).isEqualTo(1);
        }
    }

    @Test
    void csvSpreadsheetFormulaTextIsNeutralized() {
        when(incomeEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(year.getId())).thenReturn(List.of(IncomeEntry.builder().fiscalYear(year).label("=1+1").amount(400000).build()));
        String csv = new String(service.exportFiscalYearCsv(year.getId()), StandardCharsets.UTF_8);
        assertThat(csv).contains("\"'=1+1\"");
    }

    private double value(Sheet sheet, String label) {
        for (var row : sheet) if (row.getCell(0) != null && label.equals(row.getCell(0).getStringCellValue())) return row.getCell(1).getNumericCellValue();
        throw new AssertionError("Missing summary: " + label);
    }
}
