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
public class DealTerritoryReassignmentResultDTO {

    private Integer reviewedDeals;
    private Integer reassignedDeals;
    private Integer skippedDeals;
    private List<UUID> updatedDealIds;
}
