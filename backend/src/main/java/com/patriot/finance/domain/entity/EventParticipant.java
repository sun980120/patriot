package com.patriot.finance.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "event_participants", uniqueConstraints = {
    @UniqueConstraint(name = "uk_event_participant_event_member", columnNames = {"event_id", "member_id"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventParticipant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private ClubEvent event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Builder
    private EventParticipant(ClubEvent event, Member member) {
        this.event = event;
        this.member = member;
    }
}
