package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.ChargeGroup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChargeGroupRepository extends JpaRepository<ChargeGroup, UUID> {
    List<ChargeGroup> findByFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
}
