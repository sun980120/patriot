package com.patriot.finance.domain.entity;

import com.patriot.finance.domain.enums.ClubEventStatus;
import com.patriot.finance.domain.enums.ClubEventType;
import com.patriot.finance.domain.enums.ScheduleRecurrenceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    private LocalDate startDate;

    private LocalDate endDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleRecurrenceType recurrenceType;

    private LocalDate recurrenceUntil;

    private String location;

    private String memo;

    @Builder
    private ClubEvent(
        String title,
        ClubEventType type,
        ClubEventStatus status,
        LocalDate eventDate,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime startAt,
        LocalDateTime endAt,
        ScheduleRecurrenceType recurrenceType,
        LocalDate recurrenceUntil,
        String location,
        String memo
    ) {
        this.title = title;
        this.type = type == null ? ClubEventType.ETC : type;
        this.status = status == null ? ClubEventStatus.PLANNED : status;
        this.startDate = startDate == null && startAt != null ? startAt.toLocalDate() : startDate;
        this.endDate = endDate == null && endAt != null ? endAt.toLocalDate() : endDate;
        this.startTime = startTime == null && startAt != null ? startAt.toLocalTime() : startTime;
        this.endTime = endTime == null && endAt != null ? endAt.toLocalTime() : endTime;
        this.startAt = this.startTime == null ? startAt : LocalDateTime.of(this.startDate, this.startTime);
        this.endAt = this.endTime == null ? endAt : LocalDateTime.of(this.endDate, this.endTime);
        this.eventDate = eventDate == null ? this.startDate : eventDate;
        this.recurrenceType = recurrenceType == null ? ScheduleRecurrenceType.NONE : recurrenceType;
        this.recurrenceUntil = recurrenceUntil;
        this.location = normalize(location);
        this.memo = normalize(memo);
    }

    public void update(
        String title,
        ClubEventType type,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        ScheduleRecurrenceType recurrenceType,
        LocalDate recurrenceUntil,
        String location,
        String memo
    ) {
        this.title = title;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.startAt = startTime == null ? null : LocalDateTime.of(startDate, startTime);
        this.endAt = endTime == null ? null : LocalDateTime.of(endDate, endTime);
        this.eventDate = startDate;
        this.recurrenceType = recurrenceType == null ? ScheduleRecurrenceType.NONE : recurrenceType;
        this.recurrenceUntil = recurrenceUntil;
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
