package com.patriot.finance.controller;

import com.patriot.finance.dto.SaveTacticProjectRequest;
import com.patriot.finance.dto.TacticProjectResponse;
import com.patriot.finance.service.TacticProjectService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tactics/projects")
@RequiredArgsConstructor
public class TacticProjectController {

    private final TacticProjectService tacticProjectService;

    @GetMapping
    public List<TacticProjectResponse> findMyProjects() {
        return tacticProjectService.findMyProjects();
    }

    @GetMapping("/trash")
    public List<TacticProjectResponse> findMyTrashProjects() {
        return tacticProjectService.findMyTrashProjects();
    }

    @PutMapping("/{projectId}")
    public TacticProjectResponse saveProject(
        @PathVariable String projectId,
        @Valid @RequestBody SaveTacticProjectRequest request
    ) {
        return tacticProjectService.saveProject(projectId, request);
    }

    @DeleteMapping("/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable String projectId) {
        tacticProjectService.deleteProject(projectId);
    }

    @PatchMapping("/{projectId}/restore")
    public TacticProjectResponse restoreProject(@PathVariable String projectId) {
        return tacticProjectService.restoreProject(projectId);
    }

    @DeleteMapping("/{projectId}/purge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purgeProject(@PathVariable String projectId) {
        tacticProjectService.purgeProject(projectId);
    }
}
