package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ClubEvent;
import com.patriot.finance.domain.entity.EventParticipant;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.ClubEventStatus;
import com.patriot.finance.domain.enums.EventAttendanceStatus;
import com.patriot.finance.dto.ClubEventRequest;
import com.patriot.finance.dto.ClubEventResponse;
import com.patriot.finance.dto.EventParticipantResponse;
import com.patriot.finance.repository.ClubEventRepository;
import com.patriot.finance.repository.EventParticipantRepository;
import com.patriot.finance.repository.MemberRepository;
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
        ClubEvent event = clubEventRepository.save(ClubEvent.builder()
            .title(request.title().trim())
            .type(request.type())
            .eventDate(request.eventDate())
            .location(request.location())
            .memo(request.memo())
            .build());

        replaceParticipants(event, request.participantMemberIds());
        return toResponse(event);
    }

    @Transactional
    public ClubEventResponse update(UUID eventId, ClubEventRequest request) {
        ClubEvent event = getEvent(eventId);
        event.update(
            request.title().trim(),
            request.type(),
            request.eventDate(),
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
    public void delete(UUID eventId) {
        ClubEvent event = getEvent(eventId);
        eventParticipantRepository.deleteByEventId(event.getId());
        clubEventRepository.delete(event);
    }

    private ClubEvent getEvent(UUID eventId) {
        return clubEventRepository.findById(eventId)
            .orElseThrow(() -> new IllegalArgumentException("이벤트를 찾을 수 없습니다."));
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
        return new ClubEventResponse(
            event.getId(),
            event.getTitle(),
            event.getType(),
            event.getStatus(),
            event.getEventDate(),
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
