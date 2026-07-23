package com.patriot.finance.service;

import com.patriot.finance.domain.entity.ChargeGroup;
import com.patriot.finance.domain.entity.ClubEvent;
import com.patriot.finance.domain.entity.ExpenseEntry;
import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.IncomeEntry;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MemberCharge;
import com.patriot.finance.domain.enums.AdditionalChargeStatus;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.dto.ChargeGroupResponse;
import com.patriot.finance.dto.CreateChargeGroupRequest;
import com.patriot.finance.dto.MemberChargeResponse;
import com.patriot.finance.repository.ChargeGroupRepository;
import com.patriot.finance.repository.ClubEventRepository;
import com.patriot.finance.repository.ExpenseEntryRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.IncomeEntryRepository;
import com.patriot.finance.repository.MemberChargeRepository;
import com.patriot.finance.repository.MemberRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdditionalChargeService {

    private final FiscalYearRepository fiscalYearRepository;
    private final MemberRepository memberRepository;
    private final ChargeGroupRepository chargeGroupRepository;
    private final ClubEventRepository clubEventRepository;
    private final MemberChargeRepository memberChargeRepository;
    private final ExpenseEntryRepository expenseEntryRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final PushNotificationService pushNotificationService;
    private final AuditLogService auditLogService;

    public List<ChargeGroupResponse> findChargeGroups(UUID fiscalYearId) {
        return chargeGroupRepository.findByFiscalYearIdOrderByCreatedAtDesc(fiscalYearId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ChargeGroupResponse createChargeGroup(CreateChargeGroupRequest request) {
        FiscalYear fiscalYear = fiscalYearRepository.findById(request.fiscalYearId())
            .orElseThrow(() -> new IllegalArgumentException("연도를 찾을 수 없습니다."));
        ClubEvent clubEvent = request.clubEventId() == null
            ? null
            : clubEventRepository.findById(request.clubEventId())
                .orElseThrow(() -> new IllegalArgumentException("이벤트를 찾을 수 없습니다."));

        List<Member> participants = memberRepository.findAllById(request.participantMemberIds()).stream()
            .filter(member -> member.getApprovalStatus() == ApprovalStatus.APPROVED)
            .sorted(Comparator.comparing(Member::getFullName))
            .toList();

        if (participants.isEmpty()) {
            throw new IllegalArgumentException("추가 비용을 부과할 참가자를 선택해 주세요.");
        }

        ChargeGroup chargeGroup = chargeGroupRepository.save(ChargeGroup.builder()
            .fiscalYear(fiscalYear)
            .clubEvent(clubEvent)
            .title(request.title().trim())
            .category(request.category())
            .eventDate(request.eventDate())
            .supportAmount(request.supportAmount())
            .actualCost(request.actualCost())
            .memo(request.memo())
            .build());

        List<MemberCharge> charges = participants.stream()
            .map(member -> MemberCharge.builder()
                .chargeGroup(chargeGroup)
                .member(member)
                .label(request.title().trim())
                .amount(request.amountPerParticipant())
                .status(AdditionalChargeStatus.UNPAID)
                .memo(request.memo())
                .build())
            .toList();

        List<MemberCharge> savedCharges = memberChargeRepository.saveAll(charges);
        pushNotificationService.sendAdditionalChargeCreated(chargeGroup, savedCharges);
        auditLogService.record(
            "ADDITIONAL_CHARGE_GROUP_CREATED",
            "CHARGE_GROUP",
            chargeGroup.getId(),
            chargeGroup.getTitle(),
            "추가 비용 이벤트를 생성했습니다. 참가자 " + savedCharges.size() + "명, 1인당 "
                + request.amountPerParticipant() + "원"
        );
        return toResponse(chargeGroup);
    }

    @Transactional
    public MemberChargeResponse toggleChargePaid(UUID chargeId, boolean paid) {
        MemberCharge charge = memberChargeRepository.findById(chargeId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 청구 내역을 찾을 수 없습니다."));

        charge.markPaid(paid);
        auditLogService.record(
            paid ? "ADDITIONAL_CHARGE_MARKED_PAID" : "ADDITIONAL_CHARGE_MARKED_UNPAID",
            "MEMBER_CHARGE",
            charge.getId(),
            charge.getMember().getFullName(),
            charge.getChargeGroup().getTitle() + " 추가 비용을 " + (paid ? "납부 완료" : "미납") + " 처리했습니다."
        );
        return toChargeResponse(charge);
    }

    @Transactional
    public MemberChargeResponse updateChargeAmount(UUID chargeId, Integer amount, String adjustmentReason) {
        MemberCharge charge = memberChargeRepository.findById(chargeId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 청구 내역을 찾을 수 없습니다."));

        if (charge.getChargeGroup().isSettlementCompleted()) {
            throw new IllegalArgumentException("정산 완료된 추가 비용은 금액을 수정할 수 없습니다.");
        }

        charge.updateAmount(amount, adjustmentReason);
        auditLogService.record(
            "ADDITIONAL_CHARGE_AMOUNT_UPDATED",
            "MEMBER_CHARGE",
            charge.getId(),
            charge.getMember().getFullName(),
            charge.getChargeGroup().getTitle() + " 청구 금액을 " + charge.getAmount() + "원으로 변경했습니다."
        );
        return toChargeResponse(charge);
    }

    @Transactional
    public ChargeGroupResponse settleSurplus(UUID chargeGroupId, Integer actualCost) {
        ChargeGroup group = chargeGroupRepository.findById(chargeGroupId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 이벤트를 찾을 수 없습니다."));

        boolean hasUnpaidCharge = memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream()
            .anyMatch(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID);

        if (hasUnpaidCharge) {
            throw new IllegalArgumentException("미납 참가자가 남아 있어 정산 완료를 진행할 수 없습니다.");
        }

        if (actualCost == null || actualCost <= 0) {
            throw new IllegalArgumentException("실제 사용금액을 입력해야 정산을 진행할 수 있습니다.");
        }

        int participantPaidTotal = memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.PAID)
            .mapToInt(MemberCharge::getAmount)
            .sum();

        int supportAmount = group.getSupportAmount();
        int participantExpenseAmount = Math.max(actualCost - supportAmount, 0);
        int remainingCostForParticipants = participantExpenseAmount;
        int surplus = participantPaidTotal - remainingCostForParticipants;

        expenseEntryRepository.deleteByChargeGroupId(group.getId());
        incomeEntryRepository.deleteByChargeGroupId(group.getId());

        if (supportAmount > 0) {
            expenseEntryRepository.save(ExpenseEntry.builder()
                .fiscalYear(group.getFiscalYear())
                .chargeGroup(group)
                .label(group.getTitle() + " 공용 지원")
                .amount(supportAmount)
                .memo(group.getMemo())
                .build());
        }

        if (participantExpenseAmount > 0) {
            expenseEntryRepository.save(ExpenseEntry.builder()
                .fiscalYear(group.getFiscalYear())
                .chargeGroup(group)
                .label(group.getTitle() + " 참가자 부담")
                .amount(participantExpenseAmount)
                .memo(group.getMemo())
                .build());
        }

        if (surplus > 0) {
            incomeEntryRepository.save(IncomeEntry.builder()
                .fiscalYear(group.getFiscalYear())
                .chargeGroup(group)
                .label(group.getTitle() + " 잔액 반영")
                .amount(surplus)
                .memo("추가 비용 정산 후 남은 금액")
                .build());
        }

        group.completeSettlement(actualCost);
        auditLogService.record(
            "ADDITIONAL_CHARGE_SETTLED",
            "CHARGE_GROUP",
            group.getId(),
            group.getTitle(),
            "추가 비용 이벤트를 정산 완료했습니다. 실제 사용금액 " + actualCost + "원, 잔액 " + surplus + "원"
        );
        return toResponse(group);
    }

    @Transactional
    public ChargeGroupResponse reopenSettlement(UUID chargeGroupId) {
        ChargeGroup group = chargeGroupRepository.findById(chargeGroupId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 이벤트를 찾을 수 없습니다."));

        incomeEntryRepository.deleteByChargeGroupId(group.getId());
        expenseEntryRepository.deleteByChargeGroupId(group.getId());
        group.reopenSettlement();
        auditLogService.record(
            "ADDITIONAL_CHARGE_SETTLEMENT_REOPENED",
            "CHARGE_GROUP",
            group.getId(),
            group.getTitle(),
            "추가 비용 정산을 수정 모드로 전환했습니다."
        );

        return toResponse(group);
    }

    @Transactional
    public void deleteChargeGroup(UUID chargeGroupId) {
        ChargeGroup group = chargeGroupRepository.findById(chargeGroupId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 이벤트를 찾을 수 없습니다."));

        memberChargeRepository.deleteByChargeGroupId(group.getId());
        incomeEntryRepository.deleteByChargeGroupId(group.getId());
        expenseEntryRepository.deleteByChargeGroupId(group.getId());
        auditLogService.record(
            "ADDITIONAL_CHARGE_GROUP_DELETED",
            "CHARGE_GROUP",
            group.getId(),
            group.getTitle(),
            "추가 비용 이벤트와 연결된 청구/세입/지출 내역을 삭제했습니다."
        );
        chargeGroupRepository.delete(group);
    }

    private ChargeGroupResponse toResponse(ChargeGroup group) {
        List<MemberChargeResponse> participantCharges = memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream()
            .map(this::toChargeResponse)
            .toList();
        int participantChargeTotal = participantCharges.stream().mapToInt(MemberChargeResponse::amount).sum();
        int participantPaidTotal = participantCharges.stream()
            .filter(charge -> charge.status() == AdditionalChargeStatus.PAID)
            .mapToInt(MemberChargeResponse::amount)
            .sum();
        int surplusAmount = group.getActualCost() == null
            ? 0
            : Math.max(participantPaidTotal - Math.max(group.getActualCost() - group.getSupportAmount(), 0), 0);

        return new ChargeGroupResponse(
            group.getId(),
            group.getFiscalYear().getId(),
            group.getClubEvent() == null ? null : group.getClubEvent().getId(),
            group.getClubEvent() == null ? null : group.getClubEvent().getTitle(),
            group.getTitle(),
            group.getCategory(),
            group.getEventDate(),
            group.getSupportAmount(),
            group.getActualCost(),
            group.isSettlementCompleted(),
            participantChargeTotal,
            participantPaidTotal,
            surplusAmount,
            group.getMemo(),
            group.getCreatedAt(),
            participantCharges
        );
    }

    private MemberChargeResponse toChargeResponse(MemberCharge charge) {
        return new MemberChargeResponse(
            charge.getId(),
            charge.getChargeGroup().getId(),
            charge.getMember().getId(),
            charge.getMember().getFullName(),
            charge.getMember().getUsername(),
            charge.getAmount(),
            charge.getBaseAmountOrAmount(),
            charge.getAdjustmentReason(),
            charge.getStatus(),
            charge.getPaidAt(),
            charge.getMemo()
        );
    }
}
