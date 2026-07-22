package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "tactic_shares")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TacticShare extends BaseEntity {

    @Column(name = "public_id", nullable = false, unique = true, length = 32)
    private String publicId;

    @Column(name = "project_id", length = 80)
    private String projectId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "text")
    private String snapshotJson;

    @Column(nullable = false)
    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private Member createdBy;

    private TacticShare(String publicId, String projectId, String title, String snapshotJson, Member createdBy) {
        this.publicId = publicId;
        this.projectId = projectId;
        this.title = title;
        this.snapshotJson = snapshotJson;
        this.createdBy = createdBy;
        this.active = true;
    }

    public static TacticShare create(String publicId, String projectId, String title, String snapshotJson, Member createdBy) {
        return new TacticShare(publicId, projectId, title, snapshotJson, createdBy);
    }

    public void updateSnapshot(String title, String snapshotJson) {
        this.title = title;
        this.snapshotJson = snapshotJson;
        this.active = true;
    }

    public void stopSharing() {
        this.active = false;
    }
}
