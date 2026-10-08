package com.patriot.finance.service;

import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.UpdateProfileRequest;
import com.patriot.finance.repository.MemberRepository;
import jakarta.validation.Validation;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberProfileTest {

    @Mock private MemberRepository memberRepository;
    @InjectMocks private MemberService memberService;

    @Test
    void changesNameAndTrimsSurroundingWhitespace() {
        Member member = existingMember();
        UUID memberId = UUID.randomUUID();
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        var response = memberService.updateProfile(memberId, request("  새 이름  "));

        assertThat(member.getFullName()).isEqualTo("새 이름");
        assertThat(response.fullName()).isEqualTo("새 이름");
    }

    @Test
    void preservesNameForOlderClientsWithoutNameField() {
        Member member = existingMember();
        UUID memberId = UUID.randomUUID();
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        var response = memberService.updateProfile(memberId, request(null));

        assertThat(response.fullName()).isEqualTo("기존 이름");
    }

    @Test
    void validatesBlankAndOversizedNamesButAllowsOmittedName() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String name : new String[] {"", "   ", "\n\t", "가".repeat(256)}) {
                assertThat(validator.validate(request(name)))
                    .anyMatch(violation -> violation.getPropertyPath().toString().equals("fullName"));
            }
            assertThat(validator.validate(request(null))).isEmpty();
            assertThat(validator.validate(request("심은찬"))).isEmpty();
        }
    }

    private UpdateProfileRequest request(String fullName) {
        return new UpdateProfileRequest(fullName, "member", "서울", "", LocalDate.of(2000, 1, 1));
    }

    private Member existingMember() {
        return Member.builder()
            .fullName("기존 이름")
            .username("member")
            .appRole(AppRole.MEMBER)
            .memberGrade(MemberGrade.정회원)
            .gradeSource(GradeSource.AUTO)
            .build();
    }
}
