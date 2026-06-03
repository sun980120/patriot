package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.RefreshToken;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    @Modifying
    @Query("""
        update RefreshToken token
           set token.revokedAt = :revokedAt
         where token.member.id = :memberId
           and token.revokedAt is null
    """)
    void revokeActiveTokensByMemberId(@Param("memberId") UUID memberId, @Param("revokedAt") LocalDateTime revokedAt);

    @Modifying
    @Query("delete from RefreshToken token where token.expiresAt < :expiredBefore")
    void deleteExpiredBefore(@Param("expiredBefore") LocalDateTime expiredBefore);
}
