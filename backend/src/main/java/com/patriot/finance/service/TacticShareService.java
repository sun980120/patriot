package com.patriot.finance.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.TacticProject;
import com.patriot.finance.domain.entity.TacticShare;
import com.patriot.finance.domain.enums.AppRole;
import com.patriot.finance.domain.enums.MemberGrade;
import com.patriot.finance.dto.CreateTacticShareRequest;
import com.patriot.finance.dto.TacticShareResponse;
import com.patriot.finance.exception.ResourceNotFoundException;
import com.patriot.finance.repository.TacticProjectRepository;
import com.patriot.finance.repository.TacticShareRepository;
import com.patriot.finance.security.SecurityUtils;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TacticShareService {

    private static final int MAX_SNAPSHOT_BYTES = 1_000_000;
    private static final int MAX_SCENES = 100;

    private final TacticShareRepository tacticShareRepository;
    private final TacticProjectRepository tacticProjectRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public TacticShareResponse createShare(CreateTacticShareRequest request) {
        validateSnapshot(request.snapshot());
        String projectId = extractProjectId(request.snapshot());
        String snapshotJson = serialize(request.snapshot());
        if (snapshotJson.getBytes(StandardCharsets.UTF_8).length > MAX_SNAPSHOT_BYTES) {
            throw new IllegalArgumentException("공유 전술 데이터는 1MB를 초과할 수 없습니다.");
        }

        Member currentMember = SecurityUtils.currentUser().getMember();
        TacticShare existingShare = tacticShareRepository
            .findByCreatedByIdAndProjectId(currentMember.getId(), projectId)
            .orElse(null);

        if (existingShare != null) {
            existingShare.updateSnapshot(request.title().trim(), snapshotJson);
            return toResponse(existingShare);
        }

        TacticShare share = TacticShare.create(
            createPublicId(),
            projectId,
            request.title().trim(),
            snapshotJson,
            currentMember
        );
        return toResponse(tacticShareRepository.save(share));
    }

    @Transactional(readOnly = true)
    public List<TacticShareResponse> findActiveShares() {
        return tacticShareRepository.findTop50ByActiveTrueOrderByUpdatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public TacticShareResponse findShare(String publicId) {
        if (publicId == null || !publicId.matches("[a-f0-9]{32}")) {
            throw new ResourceNotFoundException("공유 전술을 찾을 수 없습니다.");
        }

        TacticShare share = tacticShareRepository.findByPublicIdAndActiveTrue(publicId)
            .orElseThrow(() -> new ResourceNotFoundException("공유 전술을 찾을 수 없습니다."));
        return toResponse(share);
    }

    @Transactional
    public TacticShareResponse stopShare(String publicId) {
        if (publicId == null || !publicId.matches("[a-f0-9]{32}")) {
            throw new ResourceNotFoundException("공유 전술을 찾을 수 없습니다.");
        }

        Member currentMember = SecurityUtils.currentUser().getMember();
        TacticShare share = isShareModerator(currentMember)
            ? tacticShareRepository.findByPublicIdAndActiveTrue(publicId)
                .orElseThrow(() -> new ResourceNotFoundException("공유 전술을 찾을 수 없습니다."))
            : tacticShareRepository.findByPublicIdAndCreatedById(publicId, currentMember.getId())
                .orElseThrow(() -> new ResourceNotFoundException("공유 전술을 찾을 수 없습니다."));
        share.stopSharing();
        syncOwnerProjectShareState(share);
        return toResponse(share);
    }

    private void syncOwnerProjectShareState(TacticShare share) {
        if (share.getProjectId() == null || share.getProjectId().isBlank()) {
            return;
        }

        tacticProjectRepository.findByOwnerIdAndProjectId(share.getCreatedBy().getId(), share.getProjectId())
            .ifPresent((project) -> project.update(
                project.getTitle(),
                serializeProjectSnapshotWithStoppedShare(project, share.getPublicId())
            ));
    }

    private String serializeProjectSnapshotWithStoppedShare(TacticProject project, String publicId) {
        JsonNode snapshot = deserialize(project.getSnapshotJson());
        if (!snapshot.isObject()) {
            return project.getSnapshotJson();
        }

        if (publicId.equals(snapshot.path("shareId").asText(null))) {
            ((com.fasterxml.jackson.databind.node.ObjectNode) snapshot).put("shareActive", false);
        }

        return serialize(snapshot);
    }

    private boolean isShareModerator(Member member) {
        return member.getAppRole() == AppRole.ADMIN
            || member.getAppRole() == AppRole.SUPER_ADMIN
            || member.getMemberGrade() == MemberGrade.간사;
    }

    private void validateSnapshot(JsonNode snapshot) {
        if (!snapshot.isObject() || snapshot.path("version").asInt(-1) != 1) {
            throw new IllegalArgumentException("지원하지 않는 전술 데이터 형식입니다.");
        }

        JsonNode scenes = snapshot.path("scenes");
        if (!scenes.isArray() || scenes.isEmpty() || scenes.size() > MAX_SCENES) {
            throw new IllegalArgumentException("전술 장면은 1개 이상 100개 이하여야 합니다.");
        }

        for (JsonNode scene : scenes) {
            if (!scene.isObject() || !scene.path("objects").isArray() || !scene.path("paths").isArray()) {
                throw new IllegalArgumentException("전술 장면 데이터가 올바르지 않습니다.");
            }
        }
    }

    private String extractProjectId(JsonNode snapshot) {
        String projectId = snapshot.path("id").asText("");
        if (projectId.isBlank() || projectId.length() > 80) {
            throw new IllegalArgumentException("전술 프로젝트 식별자가 올바르지 않습니다.");
        }
        return projectId;
    }

    private String serialize(JsonNode snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("전술 데이터를 저장할 수 없습니다.", exception);
        }
    }

    private JsonNode deserialize(String snapshotJson) {
        try {
            return objectMapper.readTree(snapshotJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("저장된 전술 데이터를 읽을 수 없습니다.", exception);
        }
    }

    private String createPublicId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private TacticShareResponse toResponse(TacticShare share) {
        return new TacticShareResponse(
            share.getPublicId(),
            share.getProjectId(),
            share.getTitle(),
            share.getCreatedBy().getFullName(),
            share.isActive(),
            deserialize(share.getSnapshotJson()),
            share.getCreatedAt()
        );
    }
}
