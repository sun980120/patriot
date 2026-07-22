package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "tactic_projects",
    uniqueConstraints = @UniqueConstraint(name = "uk_tactic_projects_owner_project", columnNames = {"owner_id", "project_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TacticProject extends BaseEntity {

    @Column(name = "project_id", nullable = false, length = 80)
    private String projectId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "text")
    private String snapshotJson;

    @Column(nullable = false)
    private boolean deleted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private Member owner;

    private TacticProject(String projectId, String title, String snapshotJson, Member owner) {
        this.projectId = projectId;
        this.title = title;
        this.snapshotJson = snapshotJson;
        this.owner = owner;
        this.deleted = false;
    }

    public static TacticProject create(String projectId, String title, String snapshotJson, Member owner) {
        return new TacticProject(projectId, title, snapshotJson, owner);
    }

    public void update(String title, String snapshotJson) {
        this.title = title;
        this.snapshotJson = snapshotJson;
        this.deleted = false;
    }

    public void moveToTrash() {
        this.deleted = true;
    }

    public void restore() {
        this.deleted = false;
    }
}
