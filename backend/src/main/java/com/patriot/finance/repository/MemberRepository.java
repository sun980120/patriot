package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.Member;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    Optional<Member> findByEmail(String email);
    Optional<Member> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
