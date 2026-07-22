package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.TacticShare;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TacticShareRepository extends JpaRepository<TacticShare, UUID> {

    Optional<TacticShare> findByPublicIdAndActiveTrue(String publicId);

    Optional<TacticShare> findByPublicIdAndCreatedById(String publicId, UUID createdById);

    Optional<TacticShare> findByCreatedByIdAndProjectId(UUID createdById, String projectId);

    List<TacticShare> findTop50ByActiveTrueOrderByUpdatedAtDesc();
}
