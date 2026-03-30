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
public class TerritoryEscalationSummaryDTO {

    private Long totalEscalations;
    private Long criticalCount;
    private Long highCount;
    private Long watchCount;
    private BigDecimal totalPipelineExposure;
    private List<TerritoryEscalationItemDTO> escalations;
}
