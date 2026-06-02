package com.patriot.finance.repository;

import com.patriot.finance.domain.entity.PushSubscription;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {
    Optional<PushSubscription> findByEndpoint(String endpoint);
    List<PushSubscription> findByMemberIdAndActiveTrue(UUID memberId);
    List<PushSubscription> findByMemberIdInAndActiveTrue(Collection<UUID> memberIds);
}
