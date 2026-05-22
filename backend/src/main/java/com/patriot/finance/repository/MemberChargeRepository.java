package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.MemberCharge;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberChargeRepository extends JpaRepository<MemberCharge, UUID> {
    List<MemberCharge> findByChargeGroupFiscalYearIdOrderByCreatedAtDesc(UUID fiscalYearId);
    List<MemberCharge> findByChargeGroupIdOrderByCreatedAtDesc(UUID chargeGroupId);
    void deleteByChargeGroupId(UUID chargeGroupId);
}
