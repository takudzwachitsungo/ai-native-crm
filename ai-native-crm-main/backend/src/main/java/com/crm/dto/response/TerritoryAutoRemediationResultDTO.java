package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryAutoRemediationResultDTO {

    private Integer reviewedExceptions;
    private Integer leadsReassigned;
    private Integer companiesReassigned;
    private Integer dealsReassigned;
    private Integer resolvedReviewTasks;
    private Integer skippedExceptions;
    private List<UUID> updatedLeadIds;
    private List<UUID> updatedCompanyIds;
    private List<UUID> updatedDealIds;
}
