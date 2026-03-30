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
public class CompanyTerritoryReassignmentResultDTO {

    private Integer reviewedCompanies;
    private Integer reassignedCompanies;
    private Integer alignedDeals;
    private Integer skippedCompanies;
    private List<UUID> updatedCompanyIds;
    private List<UUID> updatedDealIds;
}
