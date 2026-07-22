package com.patriot.finance.controller;

import com.patriot.finance.dto.AuditLogSearchRequest;
import com.patriot.finance.dto.AuditLogActorResponse;
import com.patriot.finance.dto.AuditLogResponse;
import com.patriot.finance.service.AuditLogService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    public List<AuditLogResponse> auditLogs(
        @RequestParam(required = false) String action,
        @RequestParam(required = false) UUID actorId,
        @RequestParam(required = false) String targetType,
        @RequestParam(required = false) String targetKeyword,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @RequestParam(required = false) Integer limit
    ) {
        return auditLogService.search(new AuditLogSearchRequest(
            action,
            actorId,
            targetType,
            targetKeyword,
            fromDate,
            toDate,
            limit
        ));
    }

    @GetMapping("/actors")
    public List<AuditLogActorResponse> actors() {
        return auditLogService.findActors();
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAuditLogs(
        @RequestParam(required = false) String action,
        @RequestParam(required = false) UUID actorId,
        @RequestParam(required = false) String targetType,
        @RequestParam(required = false) String targetKeyword,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        byte[] csv = auditLogService.exportCsv(new AuditLogSearchRequest(
            action,
            actorId,
            targetType,
            targetKeyword,
            fromDate,
            toDate,
            null
        ));

        return ResponseEntity.ok()
            .contentType(new MediaType("text", "csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                .filename("audit-logs.csv")
                .build()
                .toString())
            .body(csv);
    }
}
