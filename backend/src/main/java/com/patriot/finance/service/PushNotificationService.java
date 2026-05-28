package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.MembershipPayment;
import com.patriot.finance.domain.entity.PushSubscription;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.PushSendResponse;
import com.patriot.finance.dto.PushSubscriptionRequest;
import com.patriot.finance.dto.VapidPublicKeyResponse;
import com.patriot.finance.repository.FiscalYearRepository;
import com.patriot.finance.repository.MemberRepository;
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
        FiscalYear fiscalYear = fiscalYearRepository.findByYear(today.getYear())
            .filter(year -> year.getVisibleMonths().contains(today.getMonthValue()))
            .orElse(null);

        if (fiscalYear == null) {
            return new PushSendResponse(0, 0, 0, "현재 월에 해당하는 연도 데이터가 없습니다.");
        }

        List<UUID> targetMemberIds = memberRepository.findAll().stream()
            .filter(Member::isActive)
            .filter(member -> member.getApprovalStatus() == ApprovalStatus.APPROVED)
            .filter(member -> member.getMemberGrade() != MemberGrade.간사)
            .filter(member -> !member.isExemptFor(fiscalYear.getYear(), today.getMonthValue()))
            .filter(member -> isMonthlyDueUnpaid(fiscalYear, member, today.getMonthValue()))
            .map(Member::getId)
            .toList();

        if (targetMemberIds.isEmpty()) {
            return new PushSendResponse(0, 0, 0, "이번 달 회비 알림 대상자가 없습니다.");
        }

        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByMemberIdInAndActiveTrue(targetMemberIds);
        return sendToSubscriptions(subscriptions, "이번 달 회비 알림을 발송했습니다.");
    }

    private boolean isMonthlyDueUnpaid(FiscalYear fiscalYear, Member member, int month) {
        MembershipPayment payment = paymentRepository.findByFiscalYearIdAndMemberIdAndMonth(fiscalYear.getId(), member.getId(), month)
            .orElse(null);
        return payment == null || (!payment.isPaid() && !payment.isManualExempt());
    }

    private PushSendResponse sendToSubscriptions(List<PushSubscription> subscriptions, String message) {
        if (!isVapidConfigured()) {
            return new PushSendResponse(subscriptions.size(), 0, subscriptions.size(), "VAPID 키가 설정되지 않았습니다.");
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

        return new PushSendResponse(subscriptions.size(), sent, failed, message);
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
