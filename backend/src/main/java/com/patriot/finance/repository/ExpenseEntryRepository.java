package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.ExpenseEntry;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseEntryRepository extends JpaRepository<ExpenseEntry, UUID> {
    List<ExpenseEntry> findByFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    void deleteByChargeGroupId(UUID chargeGroupId);
}
