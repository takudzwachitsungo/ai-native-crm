package com.crm.dto.response;

import com.crm.entity.enums.DealStage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealStatsDTO {
    
    private Long totalDeals;
    private Map<DealStage, Long> dealsByStage;
    private Map<DealStage, BigDecimal> valueByStage;
    private BigDecimal totalValue;
    private BigDecimal weightedTotalValue;
    private BigDecimal averageDealValue;
    private Long wonDealsThisMonth;
    private BigDecimal wonValueThisMonth;
    private Double winRate;
    private Long activeDeals;
    private Long highRiskDealCount;
    private Long stalledDealCount;
    private Long overdueNextStepCount;
    private Long dealsNeedingAttention;
    private Long pendingApprovalCount;
}
