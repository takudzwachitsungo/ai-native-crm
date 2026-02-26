package com.crm.dto.response;

import com.crm.entity.enums.LeadStatus;
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
public class LeadStatsDTO {
    
    private Long totalLeads;
    private Map<LeadStatus, Long> leadsByStatus;
    private BigDecimal totalEstimatedValue;
    private Double averageScore;
    private Long leadsConvertedThisMonth;
    private Double conversionRate;
}
