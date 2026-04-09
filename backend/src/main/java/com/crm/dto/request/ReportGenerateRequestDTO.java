package com.crm.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportGenerateRequestDTO {
    private String reportType;
    private String reportMode;
    private ReportDateRangeRequestDTO dateRange;
    private Map<String, Object> filters;
}
