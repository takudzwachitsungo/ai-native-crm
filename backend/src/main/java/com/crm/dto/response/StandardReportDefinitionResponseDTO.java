package com.crm.dto.response;

import com.crm.dto.request.ReportDateRangeRequestDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StandardReportDefinitionResponseDTO {
    private UUID id;
    private String name;
    private String reportType;
    private String reportMode;
    private ReportDateRangeRequestDTO dateRange;
    private Map<String, Object> filters;
    private Integer runCount;
    private LocalDateTime lastRunAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
