package com.patriot.finance.service;

import com.patriot.finance.domain.entity.AuditLog;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.dto.AuditLogResponse;
import com.patriot.finance.repository.AuditLogRepository;
import com.patriot.finance.security.CustomUserPrincipal;
import com.patriot.finance.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogService {

    private static final int DEFAULT_LIMIT = 100;
    private static final int MAX_LIMIT = 300;

    private final AuditLogRepository auditLogRepository;

    public List<AuditLogResponse> findRecent(Integer limit) {
        int normalizedLimit = Math.min(Math.max(limit == null ? DEFAULT_LIMIT : limit, 1), MAX_LIMIT);
        return auditLogRepository.findAll(
                PageRequest.of(0, normalizedLimit, Sort.by(Sort.Direction.DESC, "createdAt"))
            )
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String targetType, UUID targetId, String targetName, String detail) {
        CustomUserPrincipal principal = SecurityUtils.currentUser();
        Member actor = principal.getMember();

        auditLogRepository.save(AuditLog.builder()
            .action(action)
            .targetType(targetType)
            .targetId(targetId == null ? null : targetId.toString())
            .targetName(targetName)
            .actorId(actor.getId())
            .actorName(actor.getFullName())
            .detail(detail)
            .build());
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
            log.getId(),
            log.getAction(),
            log.getTargetType(),
            log.getTargetId(),
            log.getTargetName(),
            log.getActorId(),
            log.getActorName(),
            log.getDetail(),
            log.getCreatedAt()
        );
    }
}
