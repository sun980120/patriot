package com.patriot.finance.service;

import com.patriot.finance.domain.entity.FiscalYear;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.repository.MembershipPaymentRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class MonthlyReminderEligibilityTest {
    @Mock MembershipPaymentRepository paymentRepository;
    @InjectMocks PushNotificationService service;

    @Test
    void doesNotRemindForMonthsBeforeJoining() {
        Member member = Member.builder().joinedAt(LocalDateTime.of(2026, 9, 15, 0, 0)).build();
        FiscalYear year = FiscalYear.builder().year(2026).visibleMonths(List.of(5, 6, 7, 8, 9)).build();
        Boolean unpaid = ReflectionTestUtils.invokeMethod(service, "isMonthlyDueUnpaid", year, member, 8);
        assertThat(unpaid).isFalse();
        verifyNoInteractions(paymentRepository);
    }
}
