package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealAttentionSummaryDTO {

    private long activeDealCount;
    private long highRiskDealCount;
    private long stalledDealCount;
    private long overdueNextStepCount;
    private long dealsNeedingAttention;
    private List<DealAttentionItemDTO> deals;
}
