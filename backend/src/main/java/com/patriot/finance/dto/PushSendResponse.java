package com.patriot.finance.dto;

public record PushSendResponse(int targetCount, int sentCount, int failedCount, String message) {
}
