package com.patriot.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UpdateProfileRequest(
    @NotBlank String username,
    @NotBlank String address,
    String addressDetail,
    @NotNull LocalDate birthDate
) {
}
