package com.patriot.finance.service;

import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.RefreshToken;
import com.patriot.finance.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RefreshTokenService {

    private static final int TOKEN_BYTE_LENGTH = 48;

    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String issue(Member member, long expiresInSeconds) {
        byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken refreshToken = RefreshToken.builder()
            .member(member)
            .tokenHash(hash(rawToken))
            .expiresAt(LocalDateTime.now().plusSeconds(expiresInSeconds))
            .build();

        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    @Transactional
    public RefreshToken consume(String rawToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash(rawToken))
            .orElseThrow(() -> new IllegalArgumentException("자동 로그인 정보가 유효하지 않습니다."));

        if (!refreshToken.isUsable(LocalDateTime.now())) {
            refreshToken.revoke();
            throw new IllegalArgumentException("자동 로그인 정보가 만료되었습니다.");
        }

        refreshToken.revoke();
        return refreshToken;
    }

    @Transactional
    public void revokeActiveTokens(Member member) {
        refreshTokenRepository.revokeActiveTokensByMemberId(member.getId(), LocalDateTime.now());
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 해시 알고리즘을 사용할 수 없습니다.", exception);
        }
    }
}
