package com.patriot.finance.service;

import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.ApprovalStatus;
import com.patriot.finance.domain.enums.GradeSource;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.AuthResponse;
import com.patriot.finance.dto.MessageResponse;
import com.patriot.finance.dto.LoginRequest;
import com.patriot.finance.dto.MemberSummaryResponse;
import com.patriot.finance.dto.SignupRequest;
import com.patriot.finance.dto.UpdateProfileRequest;
import com.patriot.finance.dto.UsernameAvailabilityResponse;
import com.patriot.finance.repository.MemberRepository;
import com.patriot.finance.security.CustomUserPrincipal;
import com.patriot.finance.security.JwtTokenProvider;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    public static final String DEFAULT_RESET_PASSWORD = "0000";
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public MemberSummaryResponse signup(SignupRequest request) {
        if (memberRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }

        Member member = Member.builder()
            .email(request.username())
            .username(request.username())
            .passwordHash(passwordEncoder.encode(request.password()))
            .fullName(request.fullName())
            .phoneNumber(request.phoneNumber())
            .address(request.address())
            .addressDetail(request.addressDetail())
            .birthDate(request.birthDate())
            .appRole(AppRole.MEMBER)
            .memberGrade(deriveGrade(request.birthDate()))
            .gradeSource(GradeSource.AUTO)
            .approvalStatus(ApprovalStatus.PENDING)
            .active(false)
            .feeExemptionMonths(0)
            .build();

        return toResponse(memberRepository.save(member));
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        Member member = memberRepository.findByUsername(request.username())
            .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        if (!member.isActive() || member.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new DisabledException("승인되지 않았거나 비활성화된 회원입니다.");
        }

        CustomUserPrincipal principal = new CustomUserPrincipal(member);
        return new AuthResponse(
            jwtTokenProvider.generateToken(principal),
            "Bearer",
            jwtTokenProvider.getExpirationSeconds(),
            toResponse(member)
        );
    }

    public MemberSummaryResponse me(UUID memberId) {
        return toResponse(getMember(memberId));
    }

    public UsernameAvailabilityResponse checkUsernameAvailability(String username, UUID currentMemberId) {
        String normalized = username == null ? "" : username.trim();
        if (normalized.isBlank()) {
            return new UsernameAvailabilityResponse(false, "아이디를 입력해 주세요.");
        }

        boolean exists = memberRepository.findByUsername(normalized)
            .filter(member -> !member.getId().equals(currentMemberId))
            .isPresent();

        if (exists) {
            return new UsernameAvailabilityResponse(false, "이미 사용 중인 아이디입니다.");
        }

        return new UsernameAvailabilityResponse(true, "사용 가능한 아이디입니다.");
    }

    @Transactional
    public MemberSummaryResponse updateProfile(UUID memberId, UpdateProfileRequest request) {
        Member member = getMember(memberId);
        String normalizedUsername = request.username().trim();

        memberRepository.findByUsername(normalizedUsername)
            .filter(found -> !found.getId().equals(memberId))
            .ifPresent(found -> {
                throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
            });

        member.updateProfile(
            normalizedUsername,
            request.address().trim(),
            request.addressDetail() == null ? null : request.addressDetail().trim(),
            request.birthDate(),
            deriveGrade(request.birthDate())
        );

        return toResponse(member);
    }

    @Transactional
    public MessageResponse changePassword(UUID memberId, String currentPassword, String newPassword) {
        Member member = getMember(memberId);
        if (!passwordEncoder.matches(currentPassword, member.getPasswordHash())) {
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }

        member.changePassword(passwordEncoder.encode(newPassword));
        return new MessageResponse("비밀번호가 변경되었습니다.");
    }

    public List<MemberSummaryResponse> findAll() {
        return memberRepository.findAll().stream()
            .filter(member -> member.getAppRole() != AppRole.SUPER_ADMIN)
            .filter(member -> !"woosung9801@gmail.com".equalsIgnoreCase(member.getEmail()))
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public MemberSummaryResponse approve(UUID memberId) {
        Member member = getMember(memberId);
        member.approve();
        return toResponse(member);
    }

    @Transactional
    public MessageResponse deletePendingMember(UUID memberId) {
        Member member = getMember(memberId);
        if (member.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new IllegalArgumentException("승인 대기 회원만 삭제할 수 있습니다.");
        }
        memberRepository.delete(member);
        return new MessageResponse("가입 신청이 삭제되었습니다.");
    }

    @Transactional
    public MemberSummaryResponse deactivate(UUID memberId) {
        Member member = getMember(memberId);
        member.deactivate();
        return toResponse(member);
    }

    @Transactional
    public MemberSummaryResponse activate(UUID memberId) {
        Member member = getMember(memberId);
        member.activate();
        return toResponse(member);
    }

    @Transactional
    public MemberSummaryResponse updateFeeExemption(UUID memberId, Integer months) {
        Member member = getMember(memberId);
        member.updateFeeExemption(months);
        return toResponse(member);
    }

    @Transactional
    public MemberSummaryResponse promoteToAdmin(UUID memberId) {
        Member member = getMember(memberId);
        member.promoteToAdmin();
        return toResponse(member);
    }

    @Transactional
    public MemberSummaryResponse adminToPromote(UUID memberId) {
        Member member = getMember(memberId);
        member.adminToPromote();
        return toResponse(member);
    }

    @Transactional
    public MessageResponse resetPassword(UUID memberId) {
        Member member = getMember(memberId);
        member.changePassword(passwordEncoder.encode(DEFAULT_RESET_PASSWORD));
        return new MessageResponse("비밀번호가 기본값 0000으로 초기화되었습니다.");
    }

    @Transactional
    public void syncAutoGrades() {
        memberRepository.findAll().forEach(member -> member.syncAutoGrade(deriveGrade(member.getBirthDate())));
    }

    public MemberGrade deriveGrade(LocalDate birthDate) {
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        return age >= 19 ? MemberGrade.정회원 : MemberGrade.준회원;
    }

    private Member getMember(UUID memberId) {
        return memberRepository.findById(memberId)
            .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
    }

    private MemberSummaryResponse toResponse(Member member) {
        return new MemberSummaryResponse(
            member.getId(),
            member.getFullName(),
            member.getEmail(),
            member.getUsername(),
            member.getPhoneNumber(),
            member.getAddress(),
            member.getAddressDetail(),
            member.getBirthDate(),
            member.getAppRole(),
            member.getMemberGrade(),
            member.getGradeSource(),
            member.getApprovalStatus(),
            member.isActive(),
            member.getFeeExemptionMonths(),
            member.getFeeExemptionStartDate(),
            member.getJoinedAt()
        );
    }
}
