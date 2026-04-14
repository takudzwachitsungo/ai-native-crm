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
public class CustomerDataGovernanceSummaryDTO {

    private Long totalLeads;
    private Long totalContacts;
    private Long totalCompanies;
    private Long recordsWithoutConsent;
    private Long suppressedRecords;
    private Long recordsNeedingEnrichment;
    private Long duplicateCandidateCount;
    private Double averageLeadQualityScore;
    private Double averageContactQualityScore;
    private Double averageCompanyQualityScore;
    private List<CustomerDuplicateCandidateDTO> topDuplicateCandidates;
}
