package com.patriot.finance.controller;

import com.patriot.finance.dto.PaymentResponse;
import com.patriot.finance.dto.TogglePaymentRequest;
import com.patriot.finance.service.PaymentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<PaymentResponse> payments(@RequestParam UUID fiscalYearId) {
        return paymentService.findByFiscalYear(fiscalYearId);
    }

    @PatchMapping("/toggle")
    public PaymentResponse toggle(@Valid @RequestBody TogglePaymentRequest request) {
        return paymentService.toggle(request);
    }
}
