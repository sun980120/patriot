package com.patriot.finance.controller;

import com.patriot.finance.dto.FinanceEntryRequest;
import com.patriot.finance.dto.FinanceEntryResponse;
import com.patriot.finance.service.FinanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    @GetMapping("/incomes")
    public List<FinanceEntryResponse> incomes(@RequestParam UUID fiscalYearId) {
        return financeService.findIncomes(fiscalYearId);
    }

    @GetMapping("/expenses")
    public List<FinanceEntryResponse> expenses(@RequestParam UUID fiscalYearId) {
        return financeService.findExpenses(fiscalYearId);
    }

    @PostMapping("/incomes")
    @ResponseStatus(HttpStatus.CREATED)
    public FinanceEntryResponse createIncome(@Valid @RequestBody FinanceEntryRequest request) {
        return financeService.createIncome(request);
    }

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public FinanceEntryResponse createExpense(@Valid @RequestBody FinanceEntryRequest request) {
        return financeService.createExpense(request);
    }

    @DeleteMapping("/incomes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIncome(@PathVariable UUID id) {
        financeService.deleteIncome(id);
    }

    @DeleteMapping("/expenses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@PathVariable UUID id) {
        financeService.deleteExpense(id);
    }
}
