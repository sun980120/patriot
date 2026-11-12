package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.MemberCharge;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberChargeRepository extends JpaRepository<MemberCharge, UUID> {
    @Query("select c.chargeGroup.id from MemberCharge c where c.id = :id")
    Optional<UUID> findGroupId(@Param("id") UUID id);
    List<MemberCharge> findByChargeGroupFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    List<MemberCharge> findByChargeGroupIdOrderByCreatedAtDesc(UUID chargeGroupId);
    void deleteByChargeGroupId(UUID chargeGroupId);
}
