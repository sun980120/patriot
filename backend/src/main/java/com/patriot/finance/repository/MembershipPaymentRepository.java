package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.MembershipPayment;
import java.util.List;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipPaymentRepository extends JpaRepository<MembershipPayment, UUID> {
    List<MembershipPayment> findByFiscalYearId(UUID fiscalYearId);
    List<MembershipPayment> findByMemberId(UUID memberId);
    List<MembershipPayment> findByMemberIdIn(Collection<UUID> memberIds);
    Optional<MembershipPayment> findByFiscalYearIdAndMemberIdAndMonth(UUID fiscalYearId, UUID memberId, Integer month);
}
