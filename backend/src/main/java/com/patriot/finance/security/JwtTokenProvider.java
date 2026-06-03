package com.patriot.finance.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long expirationSeconds;
    private final long rememberMeExpirationSeconds;

    public JwtTokenProvider(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-seconds:43200}") long expirationSeconds,
        @Value("${app.jwt.remember-me-expiration-seconds:2592000}") long rememberMeExpirationSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationSeconds = expirationSeconds;
        this.rememberMeExpirationSeconds = rememberMeExpirationSeconds;
    }

    public String generateToken(CustomUserPrincipal principal) {
        return generateToken(principal, expirationSeconds);
    }

    public String generateToken(CustomUserPrincipal principal, long tokenExpirationSeconds) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(tokenExpirationSeconds);

        return Jwts.builder()
            .subject(principal.getUsername())
            .claim("memberId", principal.getMember().getId().toString())
            .claim("role", principal.getMember().getAppRole().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(secretKey)
            .compact();
    }

    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID getMemberId(String token) {
        return UUID.fromString(parseClaims(token).get("memberId", String.class));
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public long getRememberMeExpirationSeconds() {
        return rememberMeExpirationSeconds;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
