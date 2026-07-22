package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.AuditLog;
import com.patriot.finance.dto.AuditLogActorResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    @Query("""
        select distinct new com.patriot.finance.dto.AuditLogActorResponse(log.actorId, log.actorName)
        from AuditLog log
        where log.actorId is not null
        order by log.actorName asc
    """)
    List<AuditLogActorResponse> findDistinctActors();
}
