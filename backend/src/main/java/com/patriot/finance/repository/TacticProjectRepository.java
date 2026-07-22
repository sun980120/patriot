package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.TacticProject;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TacticProjectRepository extends JpaRepository<TacticProject, UUID> {

    List<TacticProject> findByOwnerIdAndDeletedFalseOrderByUpdatedAtDesc(UUID ownerId);

    List<TacticProject> findByOwnerIdAndDeletedTrueOrderByUpdatedAtDesc(UUID ownerId);

    Optional<TacticProject> findByOwnerIdAndProjectId(UUID ownerId, String projectId);
}
