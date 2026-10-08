package com.patriot.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
    @Pattern(regexp = "(?s).*\\S.*", message = "이름을 입력해 주세요.")
    @Size(max = 255, message = "이름은 255자 이하로 입력해 주세요.") String fullName,
    @NotBlank String username,
    @NotBlank String address,
    String addressDetail,
    @NotNull LocalDate birthDate
) {
}
