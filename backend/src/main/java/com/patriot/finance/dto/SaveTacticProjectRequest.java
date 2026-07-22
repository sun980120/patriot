package com.patriot.finance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveTacticProjectRequest(
    @NotBlank(message = "전술 제목을 입력하세요.")
    @Size(max = 120, message = "전술 제목은 120자 이하여야 합니다.")
    String title,

    @NotNull(message = "저장할 전술 데이터가 필요합니다.")
    JsonNode snapshot
) {
}
