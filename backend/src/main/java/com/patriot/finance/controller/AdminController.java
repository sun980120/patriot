package com.patriot.finance.controller;

import com.patriot.finance.dto.MemberSummaryResponse;
import com.patriot.finance.dto.MessageResponse;
import com.patriot.finance.service.MemberService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
public class AdminController {

    private final MemberService memberService;

    @GetMapping
    public List<MemberSummaryResponse> members() {
        return memberService.findAll();
    }

    @PatchMapping("/{memberId}/approve")
    public MemberSummaryResponse approve(@PathVariable UUID memberId) {
        return memberService.approve(memberId);
    }

    @PatchMapping("/{memberId}/reject")
    public MemberSummaryResponse reject(@PathVariable UUID memberId) {
        return memberService.reject(memberId);
    }

    @PatchMapping("/{memberId}/deactivate")
    public MemberSummaryResponse deactivate(@PathVariable UUID memberId) {
        return memberService.deactivate(memberId);
    }

    @PatchMapping("/{memberId}/activate")
    public MemberSummaryResponse activate(@PathVariable UUID memberId) {
        return memberService.activate(memberId);
    }

    @PatchMapping("/{memberId}/promote-admin")
    public MemberSummaryResponse promoteAdmin(@PathVariable UUID memberId) {
        return memberService.promoteToAdmin(memberId);
    }

    @PatchMapping("/{memberId}/admin-promote")
    public MemberSummaryResponse adminPromote(@PathVariable UUID memberId) {
        return memberService.adminToPromote(memberId);
    }

    @PatchMapping("/{memberId}/reset-password")
    public MessageResponse resetPassword(@PathVariable UUID memberId) {
        return memberService.resetPassword(memberId);
    }
}
