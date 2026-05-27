package com.patriot.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record SignupRequest(
    @NotBlank String fullName,
    @NotBlank String username,
    @NotBlank String password,
    @NotBlank String phoneNumber,
    @NotBlank String address,
    String addressDetail,
    @NotNull LocalDate birthDate
) {
}
