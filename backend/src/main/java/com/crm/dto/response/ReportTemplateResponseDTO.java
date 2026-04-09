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
public class ReportTemplateResponseDTO {
    private String id;
    private String category;
    private String title;
    private String description;
    private List<String> dataRequirements;
    private List<String> metrics;
    private List<String> displayModes;
    private String defaultMode;
}
