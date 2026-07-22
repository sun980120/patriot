package com.patriot.finance.service;

import com.patriot.finance.domain.entity.AuditLog;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.dto.AuditLogSearchRequest;
import com.patriot.finance.dto.AuditLogResponse;
import com.patriot.finance.repository.AuditLogRepository;
import com.patriot.finance.security.CustomUserPrincipal;
import com.patriot.finance.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

    public List<AuditLogResponse> search(AuditLogSearchRequest request) {
        int normalizedLimit = normalizeLimit(request.limit());
        return auditLogRepository.findAll(
                specification(request),
                PageRequest.of(0, normalizedLimit, Sort.by(Sort.Direction.DESC, "createdAt"))
            )
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public byte[] exportCsv(AuditLogSearchRequest request) {
        List<AuditLog> logs = auditLogRepository.findAll(specification(request), Sort.by(Sort.Direction.DESC, "createdAt"));
        StringBuilder builder = new StringBuilder();
        builder.append('\ufeff');
        builder.append("created_at,action,target_type,target_id,target_name,actor_id,actor_name,detail\n");
        logs.forEach(log -> builder
            .append(csv(log.getCreatedAt()))
            .append(',')
            .append(csv(log.getAction()))
            .append(',')
            .append(csv(log.getTargetType()))
            .append(',')
            .append(csv(log.getTargetId()))
            .append(',')
            .append(csv(log.getTargetName()))
            .append(',')
            .append(csv(log.getActorId()))
            .append(',')
            .append(csv(log.getActorName()))
            .append(',')
            .append(csv(log.getDetail()))
            .append('\n')
        );
        return builder.toString().getBytes(StandardCharsets.UTF_8);
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

    private int normalizeLimit(Integer limit) {
        return Math.min(Math.max(limit == null ? DEFAULT_LIMIT : limit, 1), MAX_LIMIT);
    }

    private Specification<AuditLog> specification(AuditLogSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(request.action())) {
                predicates.add(criteriaBuilder.equal(root.get("action"), request.action().trim()));
            }

            if (request.actorId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("actorId"), request.actorId()));
            }

            if (hasText(request.targetType())) {
                predicates.add(criteriaBuilder.equal(root.get("targetType"), request.targetType().trim()));
            }

            if (hasText(request.targetKeyword())) {
                String keyword = "%" + request.targetKeyword().trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("targetName")), keyword),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("targetId")), keyword),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("detail")), keyword)
                ));
            }

            if (request.fromDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), request.fromDate().atStartOfDay()));
            }

            if (request.toDate() != null) {
                LocalDateTime nextDate = request.toDate().plusDays(1).atStartOfDay();
                predicates.add(criteriaBuilder.lessThan(root.get("createdAt"), nextDate));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"").replace("\r", " ").replace("\n", " ") + "\"";
    }
}
