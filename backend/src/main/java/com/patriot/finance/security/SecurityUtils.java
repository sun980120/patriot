package com.patriot.finance.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static CustomUserPrincipal currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserPrincipal principal)) {
            throw new IllegalStateException("인증 정보를 찾을 수 없습니다.");
        }
        return principal;
    }
}
