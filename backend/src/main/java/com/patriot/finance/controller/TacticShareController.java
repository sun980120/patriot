package com.patriot.finance.controller;

import com.patriot.finance.dto.CreateTacticShareRequest;
import com.patriot.finance.dto.TacticShareResponse;
import com.patriot.finance.service.TacticShareService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tactics/shares")
@RequiredArgsConstructor
public class TacticShareController {

    private final TacticShareService tacticShareService;

    @GetMapping
    public List<TacticShareResponse> findActiveShares() {
        return tacticShareService.findActiveShares();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TacticShareResponse createShare(@Valid @RequestBody CreateTacticShareRequest request) {
        return tacticShareService.createShare(request);
    }

    @GetMapping("/{publicId}")
    public TacticShareResponse findShare(@PathVariable String publicId) {
        return tacticShareService.findShare(publicId);
    }

    @DeleteMapping("/{publicId}")
    public TacticShareResponse stopShare(@PathVariable String publicId) {
        return tacticShareService.stopShare(publicId);
    }
}
