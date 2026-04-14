package com.crm.dto.response;

import com.crm.entity.enums.SupportCaseQueue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseQueueDashboardItemDTO {

    private SupportCaseQueue supportQueue;
    private Long totalCases;
    private Long activeCases;
    private Long unassignedCases;
    private Long escalatedCases;
    private Long breachedCases;
    private Long watchCases;
    private Long urgentCases;
    private Long highTouchCases;
    private Long overdueActiveCases;
    private Long staffedOwners;
    private Long oldestActiveCaseHours;
    private Double avgActiveCasesPerOwner;
    private String healthStatus;
    private String recommendedAction;
}
