package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritorySummaryDTO {

    private String territory;
    private Boolean governed;
    private Long repCount;
    private BigDecimal quarterlyQuota;
    private BigDecimal pipelineValue;
    private BigDecimal weightedPipelineValue;
    private BigDecimal closedWonValue;
    private Double attainmentPercent;
    private Double projectedAttainmentPercent;
    private BigDecimal requiredPipelineValue;
    private Double pipelineCoverageRatio;
    private String pacingStatus;
    private Long onTrackRepCount;
    private Long watchRepCount;
    private Long atRiskRepCount;
}
