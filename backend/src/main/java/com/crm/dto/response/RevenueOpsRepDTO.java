package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueOpsRepDTO {

    private UUID userId;
    private String name;
    private String role;
    private String territory;
    private BigDecimal quarterlyQuota;
    private BigDecimal annualQuota;
    private BigDecimal pipelineValue;
    private BigDecimal weightedPipelineValue;
    private BigDecimal closedWonValue;
    private Double quarterlyAttainmentPercent;
    private Double projectedAttainmentPercent;
    private BigDecimal expectedClosedValue;
    private BigDecimal quotaGap;
    private BigDecimal requiredPipelineValue;
    private Double pipelineCoverageRatio;
    private String pacingStatus;
    private Boolean governedTerritory;
}
