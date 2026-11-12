package com.patriot.finance.service;

import com.patriot.finance.domain.entity.*;
import com.patriot.finance.domain.enums.AdditionalChargeStatus;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.repository.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdditionalChargeSettlementServiceTest {
    @Mock FiscalYearRepository fiscalYearRepository;
    @Mock MemberRepository memberRepository;
    @Mock ChargeGroupRepository chargeGroupRepository;
    @Mock ClubEventRepository clubEventRepository;
    @Mock MemberChargeRepository memberChargeRepository;
    @Mock ExpenseEntryRepository expenseEntryRepository;
    @Mock IncomeEntryRepository incomeEntryRepository;
    @Mock PushNotificationService pushNotificationService;
    @Mock AuditLogService auditLogService;
    @InjectMocks AdditionalChargeService service;
    ChargeGroup group;
    MemberCharge charge;

    @BeforeEach
    void setup() {
        FiscalYear year = FiscalYear.builder().year(2026).visibleMonths(List.of(5,6,7)).build();
        ReflectionTestUtils.setField(year, "id", UUID.randomUUID());
        group = ChargeGroup.builder().fiscalYear(year).title("대회비").supportAmount(200000).build();
        ReflectionTestUtils.setField(group, "id", UUID.randomUUID());
        Member member = Member.builder().fullName("회원").memberGrade(MemberGrade.정회원).build();
        ReflectionTestUtils.setField(member, "id", UUID.randomUUID());
        charge = MemberCharge.builder().chargeGroup(group).member(member).amount(60000).status(AdditionalChargeStatus.PAID).build();
        ReflectionTestUtils.setField(charge, "id", UUID.randomUUID());
        when(chargeGroupRepository.findForUpdate(group.getId())).thenReturn(Optional.of(group));
    }

    @Test
    void plannedSupportNeverInflatesActualExpense() {
        when(memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId())).thenReturn(List.of(charge));
        var response = service.settleSurplus(group.getId(), 100000);
        var expense = ArgumentCaptor.forClass(ExpenseEntry.class);
        verify(expenseEntryRepository).save(expense.capture());
        assertThat(expense.getValue().getAmount()).isEqualTo(100000);
        var income = ArgumentCaptor.forClass(IncomeEntry.class);
        verify(incomeEntryRepository).save(income.capture());
        assertThat(income.getValue().getAmount()).isEqualTo(60000);
        assertThat(income.getValue().getChargeGroup()).isSameAs(group);
        assertThat(response.actualCost()).isEqualTo(100000);
        assertThat(response.surplusAmount()).isEqualTo(60000);
        assertThat(response.participantPaidTotal() - expense.getValue().getAmount()).isEqualTo(-40000);
    }

    @Test
    void splitExpenseStillEqualsActualCost() {
        ReflectionTestUtils.setField(group, "supportAmount", 40000);
        when(memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId())).thenReturn(List.of(charge));
        service.settleSurplus(group.getId(), 100000);
        var expense = ArgumentCaptor.forClass(ExpenseEntry.class);
        verify(expenseEntryRepository, times(2)).save(expense.capture());
        assertThat(expense.getAllValues()).extracting(ExpenseEntry::getAmount).containsExactly(40000,60000);
        verify(incomeEntryRepository, never()).save(any());
    }

    @Test
    void unpaidSelectionIsRejectedWithoutDeletingLedgerEntries() {
        charge.markPaid(false);
        when(memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId())).thenReturn(List.of(charge));
        assertThatThrownBy(() -> service.settleSurplus(group.getId(), 100000)).hasMessageContaining("미납");
        verifyNoInteractions(expenseEntryRepository, incomeEntryRepository);
    }

    @Test
    void invalidCostDoesNotTouchLedger() {
        when(memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId())).thenReturn(List.of(charge));
        assertThatThrownBy(() -> service.settleSurplus(group.getId(), 0)).hasMessageContaining("실제 사용");
        verifyNoInteractions(expenseEntryRepository, incomeEntryRepository);
    }

    @Test
    void alreadySettledGroupCannotBeAppliedAgainWithoutReopening() {
        group.completeSettlement(100000);
        assertThatThrownBy(() -> service.settleSurplus(group.getId(), 100000)).hasMessageContaining("이미 정산");
        verifyNoInteractions(expenseEntryRepository, incomeEntryRepository);
    }

    @Test
    void settledPaymentCannotChangeAndGroupIsLockedBeforeLoadingCharge() {
        group.completeSettlement(100000);
        when(memberChargeRepository.findGroupId(charge.getId())).thenReturn(Optional.of(group.getId()));
        when(memberChargeRepository.findById(charge.getId())).thenReturn(Optional.of(charge));
        assertThatThrownBy(() -> service.toggleChargePaid(charge.getId(), false)).hasMessageContaining("정산 수정");
        assertThat(charge.getStatus()).isEqualTo(AdditionalChargeStatus.PAID);
        var order = inOrder(memberChargeRepository, chargeGroupRepository);
        order.verify(memberChargeRepository).findGroupId(charge.getId());
        order.verify(chargeGroupRepository).findForUpdate(group.getId());
        order.verify(memberChargeRepository).findById(charge.getId());
        verifyNoInteractions(auditLogService);
    }

    @Test
    void reopeningKeepsTheConfirmedLedgerUntilResettlement() {
        group.completeSettlement(100000);
        when(memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId())).thenReturn(List.of(charge));
        service.reopenSettlement(group.getId());
        assertThat(group.isSettlementCompleted()).isFalse();
        verify(expenseEntryRepository, never()).deleteByChargeGroupId(any());
        verify(incomeEntryRepository, never()).deleteByChargeGroupId(any());
    }
}
