package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.ChargeGroup;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChargeGroupRepository extends JpaRepository<ChargeGroup, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from ChargeGroup g where g.id = :id")
    Optional<ChargeGroup> findForUpdate(@Param("id") UUID id);
    List<ChargeGroup> findByFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    List<ChargeGroup> findByEventDate(LocalDate eventDate);
    List<ChargeGroup> findByEventDateLessThanEqual(LocalDate eventDate);
}
