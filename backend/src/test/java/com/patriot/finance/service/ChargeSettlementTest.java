package com.patriot.finance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patriot.finance.domain.ChargeSettlement;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ChargeSettlementTest {
    @Test
    void sharedFrontendAndBackendExamples() throws Exception {
        var cases = new ObjectMapper().readTree(getClass().getResourceAsStream("/settlement-cases.json"));
        for (var item : cases) {
            var result = ChargeSettlement.calculate(item.get("plannedSupport").asInt(), item.get("paidTotal").asInt(), item.get("actualCost").asInt());
            var expected = item.get("expected");
            assertThat(result.appliedSupport()).as(item.get("name").asText()).isEqualTo(expected.get("appliedSupport").asInt());
            assertThat(result.participantExpense()).isEqualTo(expected.get("participantExpense").asInt());
            assertThat(result.surplus()).isEqualTo(expected.get("surplus").asInt());
            assertThat(result.clubExpense()).isEqualTo(expected.get("clubExpense").asInt());
            assertThat(result.clubIncome()).isEqualTo(expected.get("clubIncome").asInt());
            assertThat(result.extraClubExpense()).isEqualTo(expected.get("extraClubExpense").asInt());
            assertThat(result.appliedSupport() + result.participantExpense()).isEqualTo(result.actualCost());
        }
    }

    @Test
    void negativeAmountsAreRejected() {
        assertThatThrownBy(() -> ChargeSettlement.calculate(-1, 60000, 100000)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ChargeSettlement.calculate(0, -1, 100000)).isInstanceOf(IllegalArgumentException.class);
    }
}
