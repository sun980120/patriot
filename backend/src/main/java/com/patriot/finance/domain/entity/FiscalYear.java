package com.patriot.finance.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.Arrays;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "fiscal_years")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FiscalYear extends BaseEntity {

    @Column(nullable = false, unique = true)
    private Integer year;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "visible_months", nullable = false, columnDefinition = "integer[]")
    private Integer[] visibleMonths = new Integer[0];

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Builder
    private FiscalYear(Integer year, List<Integer> visibleMonths, boolean active) {
        this.year = year;
        this.visibleMonths = visibleMonths == null ? new Integer[0] : visibleMonths.toArray(Integer[]::new);
        this.active = active;
    }

    public List<Integer> getVisibleMonths() {
        return Arrays.asList(visibleMonths);
    }
}
