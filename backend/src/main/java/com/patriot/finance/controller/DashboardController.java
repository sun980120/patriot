package com.patriot.finance.controller;

import com.patriot.finance.dto.DashboardResponse;
import com.patriot.finance.security.SecurityUtils;
import com.patriot.finance.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse dashboard() {
        return dashboardService.load(SecurityUtils.currentUser().getMember());
    }
}
