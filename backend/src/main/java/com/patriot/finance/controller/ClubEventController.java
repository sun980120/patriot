package com.patriot.finance.controller;

import com.patriot.finance.dto.ClubEventRequest;
import com.patriot.finance.dto.ClubEventResponse;
import com.patriot.finance.dto.ClubEventStatusRequest;
import com.patriot.finance.dto.EventAttendanceRequest;
import com.patriot.finance.service.ClubEventService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class ClubEventController {

    private final ClubEventService clubEventService;

    @GetMapping
    public List<ClubEventResponse> events() {
        return clubEventService.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ClubEventResponse create(@Valid @RequestBody ClubEventRequest request) {
        return clubEventService.create(request);
    }

    @PutMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ClubEventResponse update(@PathVariable UUID eventId, @Valid @RequestBody ClubEventRequest request) {
        return clubEventService.update(eventId, request);
    }

    @PatchMapping("/{eventId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ClubEventResponse updateStatus(@PathVariable UUID eventId, @Valid @RequestBody ClubEventStatusRequest request) {
        return clubEventService.updateStatus(eventId, request.status());
    }

    @PatchMapping("/{eventId}/participants/{memberId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ClubEventResponse updateAttendance(
        @PathVariable UUID eventId,
        @PathVariable UUID memberId,
        @Valid @RequestBody EventAttendanceRequest request
    ) {
        return clubEventService.updateAttendance(eventId, memberId, request.attendanceStatus());
    }

    @DeleteMapping("/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID eventId) {
        clubEventService.delete(eventId);
    }
}
