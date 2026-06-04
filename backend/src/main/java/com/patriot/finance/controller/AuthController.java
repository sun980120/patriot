package com.patriot.finance.controller;

import com.patriot.finance.dto.AuthResponse;
import com.patriot.finance.dto.ChangePasswordRequest;
import com.patriot.finance.dto.MessageResponse;
import com.patriot.finance.dto.LoginRequest;
import com.patriot.finance.dto.MemberSummaryResponse;
import com.patriot.finance.dto.RefreshTokenRequest;
import com.patriot.finance.dto.SignupRequest;
import com.patriot.finance.dto.UpdateProfileRequest;
import com.patriot.finance.dto.UsernameAvailabilityResponse;
import com.patriot.finance.security.SecurityUtils;
import com.patriot.finance.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final MemberService memberService;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberSummaryResponse signup(@Valid @RequestBody SignupRequest request) {
        return memberService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return memberService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return memberService.refresh(request);
    }

    @GetMapping("/me")
    public MemberSummaryResponse me() {
        return memberService.me(SecurityUtils.currentUser().getMember().getId());
    }

    @GetMapping("/check-username")
    public UsernameAvailabilityResponse checkUsername(@RequestParam String username) {
        return memberService.checkUsernameAvailability(username, SecurityUtils.currentUser().getMember().getId());
    }

    @PatchMapping("/profile")
    public MemberSummaryResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return memberService.updateProfile(SecurityUtils.currentUser().getMember().getId(), request);
    }

    @PostMapping("/change-password")
    public MessageResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return memberService.changePassword(
            SecurityUtils.currentUser().getMember().getId(),
            request.currentPassword(),
            request.newPassword()
        );
    }
}
