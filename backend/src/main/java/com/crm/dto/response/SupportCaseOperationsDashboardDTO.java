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
public class SupportCaseOperationsDashboardDTO {

    private Long totalVisibleCases;
    private Long activeCases;
    private Long unassignedActiveCases;
    private Long escalatedActiveCases;
    private Long breachedCases;
    private Long watchCases;
    private Long strategicCases;
    private List<SupportCaseQueueDashboardItemDTO> queueSummaries;
    private List<SupportCaseTypeDashboardItemDTO> caseTypeSummaries;
    private List<SupportCaseOwnerWorkloadDTO> ownerWorkloads;
}
