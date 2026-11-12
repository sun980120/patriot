package com.patriot.finance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patriot.finance.config.SecurityConfig;
import com.patriot.finance.dto.BulkPaymentRequest;
import com.patriot.finance.security.CustomUserDetailsService;
import com.patriot.finance.security.JwtAuthenticationFilter;
import com.patriot.finance.security.JwtTokenProvider;
import com.patriot.finance.service.PaymentService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PaymentController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class BulkPaymentControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean PaymentService service;
    @MockitoBean JwtTokenProvider tokenProvider;
    @MockitoBean CustomUserDetailsService userDetailsService;

    @Test
    void adminCanMarkPaid() throws Exception {
        when(service.markBulkPaid(any())).thenReturn(List.of());
        mvc.perform(patch("/api/payments/bulk-paid").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
        verify(service).markBulkPaid(any());
    }

    @Test
    void ordinaryMemberIsForbidden() throws Exception {
        mvc.perform(patch("/api/payments/bulk-paid").with(user("member").roles("MEMBER"))
            .contentType("application/json").content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mvc.perform(patch("/api/payments/bulk-paid").contentType("application/json").content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().is4xxClientError());
        verifyNoInteractions(service);
    }

    @Test
    void validatesMonthAndEmptySelection() throws Exception {
        mvc.perform(patch("/api/payments/bulk-paid").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(mapper.writeValueAsString(new BulkPaymentRequest(UUID.randomUUID(), 13, Set.of()))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void rejectsOversizedBatch() throws Exception {
        Set<UUID> ids = IntStream.range(0, 201).mapToObj(index -> UUID.randomUUID()).collect(Collectors.toSet());
        mvc.perform(patch("/api/payments/bulk-paid").with(user("admin").roles("SUPER_ADMIN"))
            .contentType("application/json").content(mapper.writeValueAsString(new BulkPaymentRequest(UUID.randomUUID(), 6, ids))))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    private BulkPaymentRequest validRequest() {
        return new BulkPaymentRequest(UUID.randomUUID(), 6, Set.of(UUID.randomUUID()));
    }
}
