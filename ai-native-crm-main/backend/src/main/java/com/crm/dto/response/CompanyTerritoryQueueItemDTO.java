package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyTerritoryQueueItemDTO {

    private UUID companyId;
    private String companyName;
    private String territory;
    private String currentOwnerName;
    private String currentOwnerTerritory;
    private UUID suggestedOwnerId;
    private String suggestedOwnerName;
    private String suggestedOwnerTerritory;
    private Long activeDealCount;
    private Long territoryMismatchDealCount;
    private Long openTaskCount;
    private Long overdueTaskCount;
    private Long childCompanyCount;
    private BigDecimal pipelineValue;
    private Integer priorityRank;
}
