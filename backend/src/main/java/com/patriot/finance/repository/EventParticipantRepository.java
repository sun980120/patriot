package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.EventParticipant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventParticipantRepository extends JpaRepository<EventParticipant, UUID> {
    List<EventParticipant> findByEventIdOrderByMemberFullNameAsc(UUID eventId);
    void deleteByEventId(UUID eventId);
}
