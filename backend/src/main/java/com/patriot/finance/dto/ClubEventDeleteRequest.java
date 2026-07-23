package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.ClubEventDeleteMode;
import java.time.LocalDate;

public record ClubEventDeleteRequest(
    ClubEventDeleteMode mode,
    LocalDate occurrenceStartDate
) {
}
