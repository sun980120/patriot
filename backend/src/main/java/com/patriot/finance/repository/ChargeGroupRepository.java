package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.ChargeGroup;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChargeGroupRepository extends JpaRepository<ChargeGroup, UUID> {
    List<ChargeGroup> findByFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    List<ChargeGroup> findByEventDate(LocalDate eventDate);
    List<ChargeGroup> findByEventDateLessThanEqual(LocalDate eventDate);
}
