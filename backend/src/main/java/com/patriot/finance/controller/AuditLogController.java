package com.patriot.finance.controller;

import com.patriot.finance.dto.AuditLogResponse;
import com.patriot.finance.service.AuditLogService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public List<AuditLogResponse> auditLogs(@RequestParam(required = false) Integer limit) {
        return auditLogService.findRecent(limit);
    }
}
