package com.patriot.finance.controller;

import com.patriot.finance.dto.FiscalYearRequest;
import com.patriot.finance.dto.FiscalYearResponse;
import com.patriot.finance.service.FiscalYearService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/years")
@RequiredArgsConstructor
public class FiscalYearController {

    private final FiscalYearService fiscalYearService;

    @GetMapping
    public List<FiscalYearResponse> list() {
        return fiscalYearService.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FiscalYearResponse create(@Valid @RequestBody FiscalYearRequest request) {
        return fiscalYearService.create(request);
    }
}
