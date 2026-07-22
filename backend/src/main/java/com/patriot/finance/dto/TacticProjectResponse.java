package com.patriot.finance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public record TacticProjectResponse(
    String projectId,
    String title,
    boolean deleted,
    JsonNode snapshot,
    LocalDateTime updatedAt
) {
}
