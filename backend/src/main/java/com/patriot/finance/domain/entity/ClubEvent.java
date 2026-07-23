package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.ClubEventStatus;
import com.patriot.finance.domain.enums.ClubEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "club_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClubEvent extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClubEventType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClubEventStatus status;

    @Column(nullable = false)
    private LocalDate eventDate;

    private String location;

    private String memo;

    @Builder
    private ClubEvent(
        String title,
        ClubEventType type,
        ClubEventStatus status,
        LocalDate eventDate,
        String location,
        String memo
    ) {
        this.title = title;
        this.type = type == null ? ClubEventType.ETC : type;
        this.status = status == null ? ClubEventStatus.PLANNED : status;
        this.eventDate = eventDate;
        this.location = normalize(location);
        this.memo = normalize(memo);
    }

    public void update(String title, ClubEventType type, LocalDate eventDate, String location, String memo) {
        this.title = title;
        this.type = type;
        this.eventDate = eventDate;
        this.location = normalize(location);
        this.memo = normalize(memo);
    }

    public void updateStatus(ClubEventStatus status) {
        this.status = status;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
