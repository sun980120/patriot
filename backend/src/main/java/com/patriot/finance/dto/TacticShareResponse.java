package com.patriot.finance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public record TacticShareResponse(
    String publicId,
    String projectId,
    String title,
    String authorName,
    boolean active,
    JsonNode snapshot,
    LocalDateTime createdAt
) {
}
