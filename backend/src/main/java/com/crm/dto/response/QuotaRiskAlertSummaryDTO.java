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
public class QuotaRiskAlertSummaryDTO {

    private Long totalAlerts;
    private Long atRiskCount;
    private Long watchCount;
    private List<QuotaRiskAlertItemDTO> alerts;
}
