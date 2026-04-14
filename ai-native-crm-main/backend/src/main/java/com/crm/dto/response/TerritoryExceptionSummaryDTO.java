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
public class TerritoryExceptionSummaryDTO {

    private Long totalExceptions;
    private Long leadExceptions;
    private Long companyExceptions;
    private Long dealExceptions;
    private Long highSeverityCount;
    private List<TerritoryExceptionItemDTO> exceptions;
}
