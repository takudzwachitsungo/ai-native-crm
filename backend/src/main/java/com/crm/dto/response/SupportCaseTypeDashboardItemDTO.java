package com.crm.dto.response;

import com.crm.entity.enums.SupportCaseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseTypeDashboardItemDTO {

    private SupportCaseType caseType;
    private Long totalCases;
    private Long activeCases;
    private Long breachedCases;
    private Long watchCases;
    private Long strategicCases;
}
