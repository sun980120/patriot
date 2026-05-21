package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.FiscalYear;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FiscalYearRepository extends JpaRepository<FiscalYear, UUID> {
    Optional<FiscalYear> findByYear(Integer year);
}
