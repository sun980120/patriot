package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.ChargeGroup;
import com.patriot.finance.domain.entity.MemberCharge;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.entity.PushSubscription;
import com.patriot.finance.domain.enums.AdditionalChargeCategory;
import com.patriot.finance.domain.enums.AdditionalChargeStatus;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.domain.enums.NotificationType;
import com.patriot.finance.dto.PushSendResponse;
import com.patriot.finance.dto.PushSubscriptionRequest;
import com.patriot.finance.dto.VapidPublicKeyResponse;
import com.patriot.finance.repository.ChargeGroupRepository;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.repository.MemberChargeRepository;
import com.patriot.finance.repository.MembershipPaymentRepository;
import com.patriot.finance.repository.PushSubscriptionRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PushNotificationService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final MemberRepository memberRepository;
    private final FiscalYearRepository fiscalYearRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final ChargeGroupRepository chargeGroupRepository;
    private final MemberChargeRepository memberChargeRepository;
    private final AppNotificationService appNotificationService;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${app.notifications.vapid.public-key:}")
    private String vapidPublicKey;

    @Value("${app.notifications.vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${app.notifications.vapid.subject:mailto:admin@patriot.local}")
    private String vapidSubject;

    public VapidPublicKeyResponse publicKey() {
        return new VapidPublicKeyResponse(isVapidConfigured(), emptyToNull(vapidPublicKey));
    }

    @Transactional
    public void saveSubscription(UUID memberId, PushSubscriptionRequest request) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        PushSubscription subscription = pushSubscriptionRepository.findByEndpoint(request.endpoint())
            .orElseGet(() -> PushSubscription.builder()
                .member(member)
                .endpoint(request.endpoint())
                .p256dh(request.keys().p256dh())
                .auth(request.keys().auth())
                .userAgent(request.userAgent())
                .active(true)
                .build());

        subscription.refresh(member, request.keys().p256dh(), request.keys().auth(), request.userAgent());
        pushSubscriptionRepository.save(subscription);
    }

    @Transactional
    public void deleteSubscription(String endpoint) {
        pushSubscriptionRepository.findByEndpoint(endpoint).ifPresent(PushSubscription::deactivate);
    }

    @Transactional
    public PushSendResponse sendTest(UUID memberId) {
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdAndActiveTrue(memberId);
        return sendToSubscriptions(subscriptions, "테스트 알림을 발송했습니다.");
    }

    @Transactional
    public PushSendResponse sendMonthlyDuesReminder() {
        LocalDate today = LocalDate.now(SEOUL);
        List<MonthlyDuePeriod> reminderPeriods = monthlyReminderPeriods(today);

        if (reminderPeriods.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "오늘 알림 대상 회비 월이 없습니다.");
        }

        List<Member> targetMembers = memberRepository.findAll().stream()
            .filter(Member::isActive)
            .filter(member -> member.getApprovalStatus() == ApprovalStatus.APPROVED)
            .filter(member -> member.getMemberGrade() != MemberGrade.간사)
            .filter(member -> reminderPeriods.stream().anyMatch(period -> isMonthlyDueUnpaid(period.fiscalYear(), member, period.month())))
            .toList();

        if (targetMembers.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "월회비 알림 대상자가 없습니다.");
        }

        targetMembers.forEach(member -> appNotificationService.create(
            member.getId(),
            NotificationType.MONTHLY_DUES,
            "월회비 납부 안내",
            "납부되지 않은 월회비가 있습니다. 납부 현황을 확인해 주세요.",
            "/dashboard"
        ));

        List<UUID> targetMemberIds = targetMembers.stream().map(Member::getId).toList();
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, targetMembers.size(), "월회비 앱 알림을 저장했습니다.");
    }

    @Transactional
    public PushSendResponse sendAdditionalChargeCreated(ChargeGroup group, List<MemberCharge> charges) {
        List<MemberCharge> targetCharges = charges.stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
            .filter(charge -> charge.getMember().isActive())
            .filter(charge -> charge.getMember().getApprovalStatus() == ApprovalStatus.APPROVED)
            .toList();

        if (targetCharges.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "추가비용 생성 알림 대상자가 없습니다.");
        }

        targetCharges.forEach(charge -> appNotificationService.create(
            charge.getMember().getId(),
            NotificationType.ADDITIONAL_CHARGE,
            group.getTitle() + " 납부 안내",
            additionalChargeMessage(group, charge, "새 추가비용이 등록되었습니다."),
            "/dashboard"
        ));

        List<UUID> targetMemberIds = targetCharges.stream()
            .map(charge -> charge.getMember().getId())
            .toList();
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, targetCharges.size(), "추가비용 생성 알림을 저장했습니다.");
    }

    @Transactional
    public PushSendResponse sendAdditionalChargeDeadlineReminders() {
        LocalDate today = LocalDate.now(SEOUL);
        List<MemberCharge> targetCharges = chargeGroupRepository.findByEventDateLessThanEqual(today).stream()
            .flatMap(group -> memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream())
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
            .filter(charge -> charge.getMember().isActive())
            .filter(charge -> charge.getMember().getApprovalStatus() == ApprovalStatus.APPROVED)
            .toList();

        if (targetCharges.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "마감일이 지난 추가비용 알림 대상자가 없습니다.");
        }

        targetCharges.forEach(charge -> appNotificationService.create(
            charge.getMember().getId(),
            NotificationType.ADDITIONAL_CHARGE,
            charge.getChargeGroup().getTitle() + " 마감일 안내",
            additionalChargeMessage(charge.getChargeGroup(), charge, "마감일이 지난 추가비용이 미납 상태입니다."),
            "/dashboard"
        ));

        List<UUID> targetMemberIds = targetCharges.stream()
            .map(charge -> charge.getMember().getId())
            .distinct()
            .toList();
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, targetCharges.size(), "추가비용 미납 알림을 저장했습니다.");
    }

    @Transactional
    public PushSendResponse sendAdditionalChargeGroupReminder(UUID chargeGroupId) {
        ChargeGroup group = chargeGroupRepository.findById(chargeGroupId)
            .orElseThrow(() -> new IllegalArgumentException("추가 비용 이벤트를 찾을 수 없습니다."));

        List<MemberCharge> targetCharges = memberChargeRepository.findByChargeGroupIdOrderByCreatedAtDesc(group.getId()).stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
            .filter(charge -> charge.getMember().isActive())
            .filter(charge -> charge.getMember().getApprovalStatus() == ApprovalStatus.APPROVED)
            .toList();

        if (targetCharges.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "추가비용 알림 대상자가 없습니다.");
        }

        targetCharges.forEach(charge -> appNotificationService.create(
            charge.getMember().getId(),
            NotificationType.ADDITIONAL_CHARGE,
            group.getTitle() + " 납부 안내",
            additionalChargeMessage(group, charge, "추가비용 납부 안내입니다."),
            "/dashboard"
        ));

        List<UUID> targetMemberIds = targetCharges.stream()
            .map(charge -> charge.getMember().getId())
            .distinct()
            .toList();
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, targetCharges.size(), "추가비용 알림을 저장했습니다.");
    }

    @Transactional
    public PushSendResponse sendAdditionalChargeFiscalYearReminder(UUID fiscalYearId) {
        fiscalYearRepository.findById(fiscalYearId)
            .orElseThrow(() -> new IllegalArgumentException("연도 정보를 찾을 수 없습니다."));

        List<MemberCharge> targetCharges = memberChargeRepository.findByChargeGroupFiscalYearIdOrderByCreatedAtDesc(fiscalYearId).stream()
            .filter(charge -> charge.getStatus() == AdditionalChargeStatus.UNPAID)
            .filter(charge -> charge.getMember().isActive())
            .filter(charge -> charge.getMember().getApprovalStatus() == ApprovalStatus.APPROVED)
            .toList();

        if (targetCharges.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "추가비용 알림 대상자가 없습니다.");
        }

        targetCharges.forEach(charge -> appNotificationService.create(
            charge.getMember().getId(),
            NotificationType.ADDITIONAL_CHARGE,
            charge.getChargeGroup().getTitle() + " 납부 안내",
            additionalChargeMessage(charge.getChargeGroup(), charge, "추가비용 납부 안내입니다."),
            "/dashboard"
        ));

        List<UUID> targetMemberIds = targetCharges.stream()
            .map(charge -> charge.getMember().getId())
            .distinct()
            .toList();
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, targetCharges.size(), "추가비용 알림을 저장했습니다.");
    }

    private List<MonthlyDuePeriod> monthlyReminderPeriods(LocalDate today) {
        boolean currentMonthReminderDay = today.getDayOfMonth() == 1 || today.getDayOfMonth() == 5;

        return fiscalYearRepository.findAll().stream()
            .flatMap(fiscalYear -> fiscalYear.getVisibleMonths().stream()
                .map(month -> new MonthlyDuePeriod(fiscalYear, month)))
            .filter(period -> isReminderPeriod(today, currentMonthReminderDay, period))
            .sorted(Comparator
                .comparing((MonthlyDuePeriod period) -> period.fiscalYear().getYear())
                .thenComparing(MonthlyDuePeriod::month))
            .toList();
    }

    private boolean isReminderPeriod(LocalDate today, boolean currentMonthReminderDay, MonthlyDuePeriod period) {
        boolean currentMonth =
            period.fiscalYear().getYear().equals(today.getYear()) &&
                period.month() == today.getMonthValue();
        LocalDate overdueStartDate = LocalDate.of(period.fiscalYear().getYear(), period.month(), 6);
        return !today.isBefore(overdueStartDate) || (currentMonthReminderDay && currentMonth);
    }

    private boolean isMonthlyDueUnpaid(FiscalYear fiscalYear, Member member, int month) {
        if (member.isExemptFor(fiscalYear.getYear(), month)) {
            return false;
        }

        MembershipPayment payment = paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(fiscalYear.getId(), member.getId(), month)
            .orElse(null);
        return payment == null || (!payment.isPaid() && !payment.isManualExempt());
    }

    private record MonthlyDuePeriod(FiscalYear fiscalYear, int month) {
    }

    private String additionalChargeMessage(ChargeGroup group, MemberCharge charge, String prefix) {
        String deadline = group.getEventDate() == null ? "마감일 미정" : "마감일 " + group.getEventDate();
        return "%s %s · %s · 납부금액 %,d원".formatted(
            prefix,
            categoryLabel(group.getCategory()),
            deadline,
            charge.getAmount()
        );
    }

    private String categoryLabel(AdditionalChargeCategory category) {
        return switch (category) {
            case JOIN_FEE -> "가입비";
            case UNIFORM_FEE -> "유니폼비";
            case DINNER_FEE -> "회식비";
            case TOURNAMENT_FEE -> "대회비";
            case ETC_FEE -> "기타 비용";
        };
    }

    private PushSendResponse sendToSubscriptions(List<PushSubscription> subscriptions, String message) {
        return sendToSubscriptions(subscriptions, subscriptions.size(), message);
    }

    private PushSendResponse sendToSubscriptions(List<PushSubscription> subscriptions, int targetCount, String message) {
        if (!isVapidConfigured()) {
            return new PushSendResponse(targetCount, 0, subscriptions.size(), "VAPID 키가 설정되지 않았습니다.");
        }

        int sent = 0;
        int failed = 0;

        for (PushSubscription subscription : subscriptions) {
            try {
                int status = sendNoPayload(subscription);
                if (status == 404 || status == 410) {
                    subscription.deactivate();
                    failed++;
                } else if (status >= 200 && status < 300) {
                    subscription.markSent();
                    sent++;
                } else {
                    failed++;
                }
            } catch (Exception ignored) {
                failed++;
            }
        }

        return new PushSendResponse(targetCount, sent, failed, message);
    }

    private int sendNoPayload(PushSubscription subscription) throws Exception {
        URI endpoint = URI.create(subscription.getEndpoint());
        String audience = endpoint.getScheme() + "://" + endpoint.getHost();
        String token = buildVapidToken(audience);

        HttpRequest request = HttpRequest.newBuilder(endpoint)
            .timeout(Duration.ofSeconds(10))
            .header("TTL", "86400")
            .header("Urgency", "normal")
            .header("Authorization", "WebPush " + token)
            .header("Crypto-Key", "p256ecdsa=" + vapidPublicKey)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private String buildVapidToken(String audience) throws Exception {
        PrivateKey privateKey = privateKeyFromVapid(vapidPrivateKey);
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + Duration.ofHours(12).toMillis());

        return Jwts.builder()
            .setAudience(audience)
            .setSubject(vapidSubject)
            .setExpiration(expiresAt)
            .signWith(privateKey, SignatureAlgorithm.ES256)
            .compact();
    }

    private PrivateKey privateKeyFromVapid(String privateKey) throws Exception {
        byte[] privateBytes = Base64.getUrlDecoder().decode(privateKey);
        AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
        parameters.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec ecSpec = parameters.getParameterSpec(ECParameterSpec.class);
        ECPrivateKeySpec keySpec = new ECPrivateKeySpec(new java.math.BigInteger(1, privateBytes), ecSpec);
        ECPrivateKey key = (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(keySpec);
        return key;
    }

    private boolean isVapidConfigured() {
        return vapidPublicKey != null && !vapidPublicKey.isBlank() && vapidPrivateKey != null && !vapidPrivateKey.isBlank();
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
