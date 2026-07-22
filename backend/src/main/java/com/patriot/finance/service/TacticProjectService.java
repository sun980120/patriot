package com.patriot.finance.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.patriot.finance.domain.entity.Member;
import com.patriot.finance.domain.entity.TacticProject;
import com.patriot.finance.dto.SaveTacticProjectRequest;
import com.patriot.finance.dto.TacticProjectResponse;
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
public class TacticProjectService {

    private static final int MAX_SNAPSHOT_BYTES = 1_000_000;
    private static final int MAX_SCENES = 100;

    private final TacticProjectRepository tacticProjectRepository;
    private final TacticShareRepository tacticShareRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<TacticProjectResponse> findMyProjects() {
        UUID ownerId = SecurityUtils.currentUser().getMember().getId();
        return tacticProjectRepository.findByOwnerIdAndDeletedFalseOrderByUpdatedAtDesc(ownerId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TacticProjectResponse> findMyTrashProjects() {
        UUID ownerId = SecurityUtils.currentUser().getMember().getId();
        return tacticProjectRepository.findByOwnerIdAndDeletedTrueOrderByUpdatedAtDesc(ownerId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public TacticProjectResponse saveProject(String projectId, SaveTacticProjectRequest request) {
        validateProjectId(projectId);
        validateSnapshot(request.snapshot());

        String snapshotProjectId = extractProjectId(request.snapshot());
        if (!projectId.equals(snapshotProjectId)) {
            throw new IllegalArgumentException("요청 전술과 저장 전술 식별자가 일치하지 않습니다.");
        }

        JsonNode normalizedSnapshot = normalizeShareState(request.snapshot());
        String snapshotJson = serialize(normalizedSnapshot);
        if (snapshotJson.getBytes(StandardCharsets.UTF_8).length > MAX_SNAPSHOT_BYTES) {
            throw new IllegalArgumentException("전술 데이터는 1MB를 초과할 수 없습니다.");
        }

        Member owner = SecurityUtils.currentUser().getMember();
        TacticProject project = tacticProjectRepository.findByOwnerIdAndProjectId(owner.getId(), projectId)
            .orElseGet(() -> TacticProject.create(projectId, request.title().trim(), snapshotJson, owner));
        project.update(request.title().trim(), snapshotJson);
        return toResponse(tacticProjectRepository.save(project));
    }

    private JsonNode normalizeShareState(JsonNode snapshot) {
        if (!snapshot.isObject()) {
            return snapshot;
        }

        String shareId = snapshot.path("shareId").asText(null);
        if (shareId == null || shareId.isBlank()) {
            ((ObjectNode) snapshot).put("shareActive", false);
            return snapshot;
        }

        boolean active = tacticShareRepository.findByPublicIdAndActiveTrue(shareId).isPresent();
        ((ObjectNode) snapshot).put("shareActive", active);
        return snapshot;
    }

    @Transactional
    public void deleteProject(String projectId) {
        validateProjectId(projectId);
        UUID ownerId = SecurityUtils.currentUser().getMember().getId();
        TacticProject project = tacticProjectRepository.findByOwnerIdAndProjectId(ownerId, projectId)
            .orElseThrow(() -> new ResourceNotFoundException("전술 보드를 찾을 수 없습니다."));
        project.moveToTrash();
    }

    @Transactional
    public TacticProjectResponse restoreProject(String projectId) {
        validateProjectId(projectId);
        UUID ownerId = SecurityUtils.currentUser().getMember().getId();
        TacticProject project = tacticProjectRepository.findByOwnerIdAndProjectId(ownerId, projectId)
            .orElseThrow(() -> new ResourceNotFoundException("전술 보드를 찾을 수 없습니다."));
        project.restore();
        return toResponse(project);
    }

    @Transactional
    public void purgeProject(String projectId) {
        validateProjectId(projectId);
        UUID ownerId = SecurityUtils.currentUser().getMember().getId();
        TacticProject project = tacticProjectRepository.findByOwnerIdAndProjectId(ownerId, projectId)
            .orElseThrow(() -> new ResourceNotFoundException("전술 보드를 찾을 수 없습니다."));
        tacticProjectRepository.delete(project);
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
        validateProjectId(projectId);
        return projectId;
    }

    private void validateProjectId(String projectId) {
        if (projectId == null || projectId.isBlank() || projectId.length() > 80) {
            throw new IllegalArgumentException("전술 프로젝트 식별자가 올바르지 않습니다.");
        }
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

    private TacticProjectResponse toResponse(TacticProject project) {
        return new TacticProjectResponse(
            project.getProjectId(),
            project.getTitle(),
            project.isDeleted(),
            deserialize(project.getSnapshotJson()),
            project.getUpdatedAt()
        );
    }
}
