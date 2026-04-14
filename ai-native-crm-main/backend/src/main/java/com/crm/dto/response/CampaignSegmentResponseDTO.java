package com.crm.dto.response;

import com.crm.entity.enums.CampaignSegmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignSegmentResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private CampaignSegmentType segmentType;
    private String targetAudience;
    private String primaryPersona;
    private String territoryFocus;
    private Integer minLeadScore;
    private BigDecimal minEstimatedValue;
    private BigDecimal maxEstimatedValue;
    private String titleKeyword;
    private String companyKeyword;
    private String[] sourceFilters;
    private String[] statusFilters;
    private Boolean includeCampaignAttributedOnly;
    private Boolean isActive;
    private String notes;
    private Long campaignsUsingSegment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
