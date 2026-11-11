package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.Member;
import java.util.Optional;
import java.util.List;
import java.util.Collection;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Member m where m.id in :ids order by m.id")
    List<Member> findForPaymentUpdate(@Param("ids") Collection<UUID> ids);

    Optional<Member> findByEmail(String email);
    Optional<Member> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
