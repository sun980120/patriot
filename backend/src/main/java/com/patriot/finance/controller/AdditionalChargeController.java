package com.patriot.finance.controller;

import com.patriot.finance.dto.ChargeGroupResponse;
import com.patriot.finance.dto.CreateChargeGroupRequest;
import com.patriot.finance.dto.MemberChargeResponse;
import com.patriot.finance.dto.MemberChargeToggleRequest;
import com.patriot.finance.dto.SettleChargeGroupRequest;
import com.patriot.finance.service.AdditionalChargeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/additional-charges")
@RequiredArgsConstructor
public class AdditionalChargeController {

    private final AdditionalChargeService additionalChargeService;

    @GetMapping
    public List<ChargeGroupResponse> chargeGroups(@RequestParam UUID fiscalYearId) {
        return additionalChargeService.findChargeGroups(fiscalYearId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChargeGroupResponse createChargeGroup(@Valid @RequestBody CreateChargeGroupRequest request) {
        return additionalChargeService.createChargeGroup(request);
    }

    @PatchMapping("/{chargeId}/toggle")
    public MemberChargeResponse toggleChargePaid(@PathVariable UUID chargeId, @Valid @RequestBody MemberChargeToggleRequest request) {
        return additionalChargeService.toggleChargePaid(chargeId, request.paid());
    }

    @PatchMapping("/{chargeGroupId}/settle")
    public ChargeGroupResponse settleSurplus(@PathVariable UUID chargeGroupId, @Valid @RequestBody SettleChargeGroupRequest request) {
        return additionalChargeService.settleSurplus(chargeGroupId, request.actualCost());
    }

    @PatchMapping("/{chargeGroupId}/reopen")
    public ChargeGroupResponse reopenSettlement(@PathVariable UUID chargeGroupId) {
        return additionalChargeService.reopenSettlement(chargeGroupId);
    }

    @DeleteMapping("/{chargeGroupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChargeGroup(@PathVariable UUID chargeGroupId) {
        additionalChargeService.deleteChargeGroup(chargeGroupId);
    }
}
