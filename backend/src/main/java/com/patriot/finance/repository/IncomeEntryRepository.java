package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.IncomeEntry;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeEntryRepository extends JpaRepository<IncomeEntry, UUID> {
    List<IncomeEntry> findByFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    void deleteByChargeGroupId(UUID chargeGroupId);
}
