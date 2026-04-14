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
public class DashboardStatsDTO {
    
    private Long totalLeads;
    private Long totalDeals;
    private BigDecimal totalRevenue;
    private Double conversionRate;
    private Double winRate;
    private Long activeDeals;
    private Long stalledDealCount;
    private Long dealsNeedingAttention;
}
