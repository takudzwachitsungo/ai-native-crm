package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignSegmentPreviewDTO {

    private UUID segmentId;
    private String segmentName;
    private Long matchedLeadCount;
    private Double averageLeadScore;
    private BigDecimal estimatedPipelineValue;
    private Map<String, Long> leadsBySource;
    private Map<String, Long> leadsByStatus;
    private Map<String, Long> leadsByTerritory;
}
