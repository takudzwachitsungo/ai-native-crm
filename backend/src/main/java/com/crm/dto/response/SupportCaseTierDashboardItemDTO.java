package com.crm.dto.response;

import com.crm.entity.enums.SupportCaseCustomerTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseTierDashboardItemDTO {

    private SupportCaseCustomerTier customerTier;
    private Long totalCases;
    private Long activeCases;
    private Long breachedCases;
    private Long watchCases;
    private Long escalatedCases;
}
