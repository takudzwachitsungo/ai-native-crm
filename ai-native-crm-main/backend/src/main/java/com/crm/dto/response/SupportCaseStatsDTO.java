package com.crm.dto.response;

import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseStatsDTO {

    private Long totalCases;
    private Long openCases;
    private Long activeCases;
    private Long unassignedActiveCases;
    private Long escalatedCases;
    private Long breachedCases;
    private Long watchCases;
    private Long overdueResponseCases;
    private Long overdueResolutionCases;
    private Long responseWatchCases;
    private Long resolutionWatchCases;
    private Long strategicCases;
    private Long premiumCases;
    private Long highTouchActiveCases;
    private Long aged24hActiveCases;
    private Long aged72hActiveCases;
    private Long aged168hActiveCases;
    private Map<SupportCaseStatus, Long> casesByStatus;
    private Map<SupportCasePriority, Long> casesByPriority;
    private Map<SupportCaseCustomerTier, Long> casesByCustomerTier;
    private Map<SupportCaseType, Long> casesByType;
    private Map<SupportCaseQueue, Long> casesByQueue;
    private Map<SupportCaseQueue, Long> openCasesByQueue;
    private List<SupportCaseQueueDashboardItemDTO> queueSummaries;
    private List<SupportCaseTypeDashboardItemDTO> caseTypeSummaries;
    private List<SupportCaseTierDashboardItemDTO> tierSummaries;
    private List<SupportCaseOwnerWorkloadDTO> ownerWorkloads;
}
