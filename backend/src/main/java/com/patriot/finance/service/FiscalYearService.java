package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.dto.FiscalYearRequest;
import com.patriot.finance.dto.FiscalYearResponse;
import com.patriot.finance.repository.FiscalYearRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FiscalYearService {

    private final FiscalYearRepository fiscalYearRepository;

    public List<FiscalYearResponse> findAll() {
        return fiscalYearRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public FiscalYearResponse create(FiscalYearRequest request) {
        fiscalYearRepository.findByYear(request.year()).ifPresent(existing -> {
            throw new IllegalArgumentException("이미 존재하는 연도입니다.");
        });

        FiscalYear saved = fiscalYearRepository.save(FiscalYear.builder()
            .year(request.year())
            .visibleMonths(getVisibleMonths(request.year()))
            .active(false)
            .build());

        return toResponse(saved);
    }

    private FiscalYearResponse toResponse(FiscalYear fiscalYear) {
        return new FiscalYearResponse(
            fiscalYear.getId(),
            fiscalYear.getYear(),
            fiscalYear.getVisibleMonths(),
            fiscalYear.isActive()
        );
    }

    private List<Integer> getVisibleMonths(int year) {
        return year == 2026
            ? List.of(5, 6, 7, 8, 9, 10, 11, 12)
            : List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
    }
}
