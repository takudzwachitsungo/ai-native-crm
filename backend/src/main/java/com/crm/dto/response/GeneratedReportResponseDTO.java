package com.crm.dto.response;

import com.crm.dto.request.ReportDateRangeRequestDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedReportResponseDTO {
    private boolean success;
    private String reportType;
    private String reportMode;
    private String title;
    private String summary;
    private ReportDateRangeRequestDTO dateRange;
    private Map<String, Object> metrics;
    private List<Map<String, Object>> charts;
    private List<String> insights;
    private List<String> recommendations;
    private List<ReportSectionResponseDTO> sections;
    private LocalDateTime generatedAt;
    private String error;
}
