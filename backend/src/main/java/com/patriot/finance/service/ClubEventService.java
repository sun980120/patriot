package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ClubEvent;
import com.patriot.finance.domain.entity.EventParticipant;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.ClubEventDeleteMode;
import com.patriot.finance.domain.enums.ClubEventStatus;
import com.patriot.finance.domain.enums.EventAttendanceStatus;
import com.patriot.finance.domain.enums.ScheduleRecurrenceType;
import com.patriot.finance.dto.ClubEventDeleteRequest;
import com.patriot.finance.dto.ClubEventRequest;
import com.patriot.finance.dto.ClubEventResponse;
import com.patriot.finance.dto.EventParticipantResponse;
import com.patriot.finance.repository.ClubEventRepository;
import com.patriot.finance.repository.EventParticipantRepository;
import com.patriot.finance.repository.MemberRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClubEventService {

    private final ClubEventRepository clubEventRepository;
    private final EventParticipantRepository eventParticipantRepository;
    private final MemberRepository memberRepository;

    public List<ClubEventResponse> findAll() {
        return clubEventRepository.findAllByOrderByEventDateDescCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ClubEventResponse create(ClubEventRequest request) {
        validateSchedule(request);
        ClubEvent event = clubEventRepository.save(ClubEvent.builder()
            .title(request.title().trim())
            .type(request.type())
            .eventDate(request.eventDate())
            .startDate(request.startDate())
            .endDate(request.endDate())
            .startTime(request.startTime())
            .endTime(request.endTime())
            .recurrenceType(request.recurrenceType())
            .recurrenceUntil(request.recurrenceUntil())
            .location(request.location())
            .memo(request.memo())
            .build());

        replaceParticipants(event, request.participantMemberIds());
        return toResponse(event);
    }

    @Transactional
    public ClubEventResponse update(UUID eventId, ClubEventRequest request) {
        validateSchedule(request);
        ClubEvent event = getEvent(eventId);
        event.update(
            request.title().trim(),
            request.type(),
            request.startDate(),
            request.endDate(),
            request.startTime(),
            request.endTime(),
            request.recurrenceType(),
            request.recurrenceUntil(),
            request.location(),
            request.memo()
        );
        replaceParticipants(event, request.participantMemberIds());
        return toResponse(event);
    }

    @Transactional
    public ClubEventResponse updateStatus(UUID eventId, ClubEventStatus status) {
        ClubEvent event = getEvent(eventId);
        event.updateStatus(status);
        return toResponse(event);
    }

    @Transactional
    public ClubEventResponse updateAttendance(UUID eventId, UUID memberId, EventAttendanceStatus attendanceStatus) {
        EventParticipant participant = eventParticipantRepository.findByEventIdAndMemberId(eventId, memberId)
            .orElseThrow(() -> new IllegalArgumentException("이벤트 참가자를 찾을 수 없습니다."));
        participant.updateAttendanceStatus(attendanceStatus);
        return toResponse(participant.getEvent());
    }

    @Transactional
    public void delete(UUID eventId, ClubEventDeleteRequest request) {
        ClubEvent event = getEvent(eventId);
        ClubEventDeleteMode mode = request == null || request.mode() == null ? ClubEventDeleteMode.ALL : request.mode();
        if (mode == ClubEventDeleteMode.ONLY_THIS) {
            excludeSingleOccurrence(event, request.occurrenceStartDate());
            return;
        }
        if (mode == ClubEventDeleteMode.THIS_AND_FOLLOWING) {
            deleteThisAndFollowing(event, request.occurrenceStartDate());
            return;
        }

        eventParticipantRepository.deleteByEventId(event.getId());
        clubEventRepository.delete(event);
    }

    private ClubEvent getEvent(UUID eventId) {
        return clubEventRepository.findById(eventId)
            .orElseThrow(() -> new IllegalArgumentException("이벤트를 찾을 수 없습니다."));
    }

    private void excludeSingleOccurrence(ClubEvent event, LocalDate occurrenceStartDate) {
        validateRecurringDelete(event, occurrenceStartDate);
        event.excludeRecurrence(occurrenceStartDate);
    }

    private void deleteThisAndFollowing(ClubEvent event, LocalDate occurrenceStartDate) {
        validateRecurringDelete(event, occurrenceStartDate);
        LocalDate startDate = event.getStartDate() == null ? event.getEventDate() : event.getStartDate();
        if (!occurrenceStartDate.isAfter(startDate)) {
            eventParticipantRepository.deleteByEventId(event.getId());
            clubEventRepository.delete(event);
            return;
        }
        event.endRecurrenceBefore(occurrenceStartDate);
    }

    private void validateRecurringDelete(ClubEvent event, LocalDate occurrenceStartDate) {
        if (event.getRecurrenceType() == ScheduleRecurrenceType.NONE) {
            throw new IllegalArgumentException("반복 일정이 아니면 전체 삭제만 사용할 수 있습니다.");
        }
        if (occurrenceStartDate == null) {
            throw new IllegalArgumentException("삭제할 반복 회차의 시작일이 필요합니다.");
        }
    }

    private void validateSchedule(ClubEventRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("종료일은 시작일보다 빠를 수 없습니다.");
        }
        if (request.startTime() != null && request.endTime() == null) {
            throw new IllegalArgumentException("시작 시간이 있으면 종료 시간도 입력해야 합니다.");
        }
        if (request.startTime() == null && request.endTime() != null) {
            throw new IllegalArgumentException("종료 시간만 단독으로 입력할 수 없습니다.");
        }
        if (
            request.startTime() != null &&
            request.startDate().equals(request.endDate()) &&
            !request.endTime().isAfter(request.startTime())
        ) {
            throw new IllegalArgumentException("같은 날짜 일정의 종료 시간은 시작 시간보다 늦어야 합니다.");
        }
        if (
            request.recurrenceType() != null &&
            request.recurrenceType().name().equals("NONE") &&
            request.recurrenceUntil() != null
        ) {
            throw new IllegalArgumentException("반복 없음 일정에는 반복 종료일을 지정할 수 없습니다.");
        }
        if (
            request.recurrenceUntil() != null &&
            request.recurrenceUntil().isBefore(request.startDate())
        ) {
            throw new IllegalArgumentException("반복 종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    private void replaceParticipants(ClubEvent event, List<UUID> participantMemberIds) {
        eventParticipantRepository.deleteByEventId(event.getId());
        if (participantMemberIds == null || participantMemberIds.isEmpty()) {
            return;
        }

        List<UUID> distinctParticipantMemberIds = participantMemberIds.stream()
            .distinct()
            .toList();
        List<Member> members = memberRepository.findAllById(distinctParticipantMemberIds).stream()
            .filter(member -> member.getApprovalStatus() == ApprovalStatus.APPROVED)
            .sorted(Comparator.comparing(Member::getFullName))
            .toList();

        List<EventParticipant> participants = members.stream()
            .map(member -> EventParticipant.builder()
                .event(event)
                .member(member)
                .build())
            .toList();
        eventParticipantRepository.saveAll(participants);
    }

    private ClubEventResponse toResponse(ClubEvent event) {
        LocalDate startDate = event.getStartDate() == null ? event.getEventDate() : event.getStartDate();
        LocalDate endDate = event.getEndDate() == null ? startDate : event.getEndDate();

        return new ClubEventResponse(
            event.getId(),
            event.getTitle(),
            event.getType(),
            event.getStatus(),
            event.getEventDate(),
            startDate,
            endDate,
            event.getStartTime(),
            event.getEndTime(),
            event.getStartAt(),
            event.getEndAt(),
            event.getRecurrenceType(),
            event.getRecurrenceUntil(),
            event.getRecurrenceExclusionDates(),
            event.getLocation(),
            event.getMemo(),
            event.getCreatedAt(),
            eventParticipantRepository.findByEventIdOrderByMemberFullNameAsc(event.getId()).stream()
                .map(participant -> new EventParticipantResponse(
                    participant.getMember().getId(),
                    participant.getMember().getFullName(),
                    participant.getMember().getUsername(),
                    participant.getAttendanceStatus()
                ))
                .toList()
        );
    }
}
