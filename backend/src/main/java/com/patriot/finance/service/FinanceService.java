package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.dto.FinanceEntryRequest;
import com.patriot.finance.dto.FinanceEntryResponse;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceService {

    private final FiscalYearRepository fiscalYearRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final ExpenseEntryRepository expenseEntryRepository;

    public List<FinanceEntryResponse> findIncomes(UUID fiscalYearId) {
        return incomeEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(fiscalYearId).stream()
            .map(this::toResponse)
            .toList();
    }

    public List<FinanceEntryResponse> findExpenses(UUID fiscalYearId) {
        return expenseEntryRepository.findByFiscalYearIdOrderByCreatedAtDesc(fiscalYearId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public FinanceEntryResponse createIncome(FinanceEntryRequest request) {
        FiscalYear fiscalYear = getFiscalYear(request.fiscalYearId());
        return toResponse(incomeEntryRepository.save(IncomeEntry.builder()
            .fiscalYear(fiscalYear)
            .label(request.label())
            .amount(request.amount())
            .memo(request.memo())
            .build()));
    }

    @Transactional
    public FinanceEntryResponse createExpense(FinanceEntryRequest request) {
        FiscalYear fiscalYear = getFiscalYear(request.fiscalYearId());
        return toResponse(expenseEntryRepository.save(ExpenseEntry.builder()
            .fiscalYear(fiscalYear)
            .label(request.label())
            .amount(request.amount())
            .memo(request.memo())
            .build()));
    }

    @Transactional
    public void deleteIncome(UUID id) {
        incomeEntryRepository.deleteById(id);
    }

    @Transactional
    public void deleteExpense(UUID id) {
        expenseEntryRepository.deleteById(id);
    }

    private FinanceEntryResponse toResponse(IncomeEntry entry) {
        return new FinanceEntryResponse(
            entry.getId(),
            entry.getFiscalYear().getId(),
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
            entry.getLabel(),
            entry.getAmount(),
            entry.getMemo(),
            entry.getCreatedAt()
        );
    }

    private FiscalYear getFiscalYear(UUID fiscalYearId) {
        return fiscalYearRepository.findById(fiscalYearId)
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
    }
}
