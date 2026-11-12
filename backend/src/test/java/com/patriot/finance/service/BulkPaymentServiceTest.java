package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.BulkPaymentRequest;
import com.patriot.finance.dto.TogglePaymentRequest;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BulkPaymentServiceTest {
    @Mock MembershipPaymentRepository paymentRepository;
    @Mock FiscalYearRepository fiscalYearRepository;
    @Mock MemberRepository memberRepository;
    @Mock AuditLogService auditLogService;
    @InjectMocks PaymentService service;
    FiscalYear year;
    Member member;

    @BeforeEach
    void setup() {
        year = FiscalYear.builder().year(Year.now(ZoneId.of("Asia/Seoul")).getValue() - 1).visibleMonths(List.of(5, 6, 7)).build();
        ReflectionTestUtils.setField(year, "id", UUID.randomUUID());
        member = member(MemberGrade.정회원);
        when(fiscalYearRepository.findById(year.getId())).thenReturn(Optional.of(year));
    }

    @Test
    void marksMixedGradesPaidWithOneHistoryQuery() {
        Member junior = member(MemberGrade.준회원);
        prepare(List.of(member, junior), List.of());
        var result = service.markBulkPaid(request(6, member, junior));
        assertThat(result).extracting(payment -> payment.chargedAmount()).containsExactly(20_000, 10_000);
        assertThat(result).allMatch(payment -> payment.paid());
        verify(paymentRepository).findByMemberIdIn(Set.of(member.getId(), junior.getId()));
        verify(paymentRepository, never()).findByMemberId(any());
        verify(auditLogService, times(2)).record(eq("MONTHLY_PAYMENT_MARKED_PAID"), anyString(), any(), anyString(), anyString());
    }

    @Test
    void repeatedRequestPreservesPaidStateAndHistoricalAmount() {
        MembershipPayment paid = payment(member, 6, true);
        paid.toggle(true, 12_000, MemberGrade.준회원);
        LocalDateTime recordedAt = LocalDateTime.of(year.getYear(), 6, 5, 12, 0);
        ReflectionTestUtils.setField(paid, "updatedAt", recordedAt);
        prepare(List.of(member), List.of(paid));
        var result = service.markBulkPaid(request(6, member));
        assertThat(result.getFirst().paid()).isTrue();
        assertThat(result.getFirst().chargedAmount()).isEqualTo(12_000);
        assertThat(result.getFirst().appliedGrade()).isEqualTo(MemberGrade.준회원);
        assertThat(result.getFirst().updatedAt()).isEqualTo(recordedAt);
        verifyNoInteractions(auditLogService);
    }

    @Test
    void rejectsEntireSelectionBeforeMutatingWhenOneMemberIsExempt() {
        Member exempt = member(MemberGrade.정회원);
        MembershipPayment unpaid = payment(member, 6, false);
        MembershipPayment exemption = payment(exempt, 6, false);
        exemption.applyManualExemption("부상", MemberGrade.정회원);
        prepare(List.of(member, exempt), List.of(unpaid, exemption));
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member, exempt))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("면제");
        assertThat(unpaid.isPaid()).isFalse();
        verify(paymentRepository, never()).saveAllAndFlush(any());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void manualExemptionDoesNotConsumeAutomaticExemptionAllowance() {
        ReflectionTestUtils.setField(member, "feeExemptionMonths", 1);
        ReflectionTestUtils.setField(member, "feeExemptionStartDate", java.time.LocalDate.of(year.getYear(), 5, 1));
        MembershipPayment manual = payment(member, 5, false);
        manual.applyManualExemption("별도 승인", MemberGrade.정회원);
        prepare(List.of(member), List.of(manual));
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("면제");
        verify(paymentRepository, never()).saveAllAndFlush(any());
    }

    @Test
    void rejectsStaff() {
        ReflectionTestUtils.setField(member, "memberGrade", MemberGrade.간사);
        prepare(List.of(member), List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("승인 회원");
    }

    @Test
    void rejectsInactiveMember() {
        member.deactivate();
        prepare(List.of(member), List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("승인 회원");
    }

    @Test
    void rejectsPendingMember() {
        ReflectionTestUtils.setField(member, "approvalStatus", ApprovalStatus.PENDING);
        prepare(List.of(member), List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("승인 회원");
    }

    @Test
    void rejectsBeforeJoining() {
        ReflectionTestUtils.setField(member, "joinedAt", LocalDateTime.of(year.getYear(), 7, 1, 0, 0));
        prepare(List.of(member), List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("가입 전");
    }

    @Test
    void rejectsUnknownMember() {
        when(memberRepository.findForPaymentUpdate(any())).thenReturn(List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(6, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("찾을 수");
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void rejectsMonthOutsideFiscalYear() {
        assertThatThrownBy(() -> service.markBulkPaid(request(4, member))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("대상 월");
        verifyNoInteractions(memberRepository, paymentRepository);
    }

    @Test
    void staleSingleToggleCannotCancelAnotherAdministratorsPayment() {
        MembershipPayment paid = payment(member, 6, true);
        when(memberRepository.findForPaymentUpdate(List.of(member.getId()))).thenReturn(List.of(member));
        when(paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(year.getId(), member.getId(), 6)).thenReturn(Optional.of(paid));
        assertThatThrownBy(() -> service.toggle(new TogglePaymentRequest(year.getId(), member.getId(), 6, false)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("다른 관리자");
        assertThat(paid.isPaid()).isTrue();
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void acceptsFuturePeriodAsAdvancePayment() {
        ReflectionTestUtils.setField(year, "year", Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1);
        prepare(List.of(member), List.of());
        var result = service.markBulkPaid(request(6, member));
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().paid()).isTrue();
        assertThat(result.getFirst().chargedAmount()).isEqualTo(20_000);
        verify(paymentRepository).saveAllAndFlush(any());
        verify(auditLogService).record(eq("MONTHLY_PAYMENT_MARKED_PAID"), anyString(), any(), anyString(), anyString());
    }

    @Test
    void acceptsSingleAdvancePayment() {
        ReflectionTestUtils.setField(year, "year", Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1);
        when(memberRepository.findForPaymentUpdate(List.of(member.getId()))).thenReturn(List.of(member));
        when(paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(year.getId(), member.getId(), 6)).thenReturn(Optional.empty());
        when(paymentRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.toggle(new TogglePaymentRequest(year.getId(), member.getId(), 6, false));
        assertThat(result.paid()).isTrue();
        assertThat(result.chargedAmount()).isEqualTo(20_000);
    }

    @Test
    void rejectsSingleAdvancePaymentBeforeJoining() {
        ReflectionTestUtils.setField(year, "year", Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1);
        ReflectionTestUtils.setField(member, "joinedAt", LocalDateTime.of(year.getYear(), 7, 1, 0, 0));
        when(memberRepository.findForPaymentUpdate(List.of(member.getId()))).thenReturn(List.of(member));
        when(paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(year.getId(), member.getId(), 6)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.toggle(new TogglePaymentRequest(year.getId(), member.getId(), 6, false)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("가입 전");
        verify(paymentRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsAutomaticExemptionEvenForAdvancePayment() {
        ReflectionTestUtils.setField(year, "year", Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1);
        ReflectionTestUtils.setField(member, "feeExemptionMonths", 1);
        ReflectionTestUtils.setField(member, "feeExemptionStartDate", java.time.LocalDate.of(year.getYear(), 5, 1));
        prepare(List.of(member), List.of());
        assertThatThrownBy(() -> service.markBulkPaid(request(5, member)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("면제");
        verify(paymentRepository, never()).saveAllAndFlush(any());
    }

    @Test
    void repeatedAdvancePaymentPreservesHistoricalAmount() {
        ReflectionTestUtils.setField(year, "year", Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1);
        MembershipPayment paid = payment(member, 6, true);
        paid.toggle(true, 10_000, MemberGrade.준회원);
        prepare(List.of(member), List.of(paid));
        var result = service.markBulkPaid(request(6, member));
        assertThat(result.getFirst().chargedAmount()).isEqualTo(10_000);
        verifyNoInteractions(auditLogService);
    }

    private Member member(MemberGrade grade) {
        Member value = Member.builder().fullName("테스트 회원").memberGrade(grade).approvalStatus(ApprovalStatus.APPROVED)
            .active(true).joinedAt(LocalDateTime.of(year.getYear(), 1, 1, 0, 0)).build();
        ReflectionTestUtils.setField(value, "id", UUID.randomUUID());
        return value;
    }

    private MembershipPayment payment(Member value, int month, boolean paid) {
        return MembershipPayment.builder().fiscalYear(year).member(value).month(month).paid(paid)
            .chargedAmount(paid ? 20_000 : 0).appliedGrade(value.getMemberGrade()).build();
    }

    private BulkPaymentRequest request(int month, Member... values) {
        return new BulkPaymentRequest(year.getId(), month, java.util.Arrays.stream(values).map(Member::getId).collect(java.util.stream.Collectors.toSet()));
    }

    private void prepare(List<Member> values, List<MembershipPayment> payments) {
        when(memberRepository.findForPaymentUpdate(any())).thenReturn(values);
        when(fiscalYearRepository.findAll()).thenReturn(List.of(year));
        when(paymentRepository.findByMemberIdIn(any())).thenReturn(payments);
    }
}
