package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueOpsSummaryDTO {

    private Long activeRepCount;
    private Long territoriesCovered;
    private Long territoryCatalogCount;
    private Long governedTerritoryCount;
    private Long outOfCatalogTerritoryCount;
    private Long repsWithoutTerritory;
    private Long onTrackRepCount;
    private Long watchRepCount;
    private Long atRiskRepCount;
    private BigDecimal totalQuarterlyQuota;
    private BigDecimal totalAnnualQuota;
    private BigDecimal pipelineValue;
    private BigDecimal weightedPipelineValue;
    private BigDecimal closedWonValue;
    private Double attainmentPercent;
    private Double projectedAttainmentPercent;
    private Double quarterProgressPercent;
    private BigDecimal expectedClosedValueToDate;
    private BigDecimal requiredPipelineValue;
    private Double pipelineCoverageRatio;
    private List<RevenueOpsRepDTO> teamProgress;
    private List<TerritorySummaryDTO> territorySummaries;
}
