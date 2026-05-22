package com.patriot.finance.dto;

import com.patriot.finance.domain.enums.AdditionalChargeCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateChargeGroupRequest(
    @NotNull UUID fiscalYearId,
    @NotBlank String title,
    @NotNull AdditionalChargeCategory category,
    LocalDate eventDate,
    @Min(0) Integer supportAmount,
    String memo,
    @NotEmpty List<UUID> participantMemberIds,
    @Min(1) Integer amountPerParticipant
) {
}
