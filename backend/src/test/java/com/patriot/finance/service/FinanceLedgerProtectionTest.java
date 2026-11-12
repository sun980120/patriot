package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ChargeGroup;
import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinanceLedgerProtectionTest {
    @Mock FiscalYearRepository fiscalYearRepository;
    @Mock IncomeEntryRepository incomeEntryRepository;
    @Mock ExpenseEntryRepository expenseEntryRepository;
    @InjectMocks FinanceService service;

    @Test
    void generatedExpenseCannotBeDeletedOutsideSettlement() {
        UUID id = UUID.randomUUID();
        when(expenseEntryRepository.findById(id)).thenReturn(Optional.of(ExpenseEntry.builder().chargeGroup(ChargeGroup.builder().title("대회").build()).amount(100000).build()));
        assertThatThrownBy(() -> service.deleteExpense(id)).hasMessageContaining("정산 수정");
        verify(expenseEntryRepository, never()).deleteById(any());
    }

    @Test
    void generatedReferenceIncomeCannotBeDeletedOutsideSettlement() {
        UUID id = UUID.randomUUID();
        when(incomeEntryRepository.findById(id)).thenReturn(Optional.of(IncomeEntry.builder().chargeGroup(ChargeGroup.builder().title("대회").build()).amount(60000).build()));
        assertThatThrownBy(() -> service.deleteIncome(id)).hasMessageContaining("정산 수정");
        verify(incomeEntryRepository, never()).deleteById(any());
    }

    @Test
    void manualExpenseCanStillBeDeleted() {
        UUID id = UUID.randomUUID();
        when(expenseEntryRepository.findById(id)).thenReturn(Optional.of(ExpenseEntry.builder().amount(1000).build()));
        service.deleteExpense(id);
        verify(expenseEntryRepository).deleteById(id);
    }

    @Test
    void manualIncomeCanStillBeDeleted() {
        UUID id = UUID.randomUUID();
        when(incomeEntryRepository.findById(id)).thenReturn(Optional.of(IncomeEntry.builder().amount(1000).build()));
        service.deleteIncome(id);
        verify(incomeEntryRepository).deleteById(id);
    }
}
