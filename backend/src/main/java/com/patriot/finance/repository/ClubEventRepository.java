package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.ClubEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubEventRepository extends JpaRepository<ClubEvent, UUID> {
    List<ClubEvent> findAllByOrderByEventDateDescCreatedAtDesc();
}
