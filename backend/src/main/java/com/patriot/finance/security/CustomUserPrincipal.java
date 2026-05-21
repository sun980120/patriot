package com.patriot.finance.security;

import com.patriot.finance.domain.entity.Member;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Getter
public class CustomUserPrincipal implements UserDetails {

    private final Member member;
    private final List<GrantedAuthority> authorities;

    public CustomUserPrincipal(Member member) {
        this.member = member;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + member.getAppRole().name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return member.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return member.getUsername() != null ? member.getUsername() : member.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return member.isActive() && member.getApprovalStatus().name().equals("APPROVED");
    }
}
