package com.crm.dto.request;

import com.crm.entity.enums.CampaignSegmentType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignSegmentRequestDTO {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull
    private CampaignSegmentType segmentType;

    @Size(max = 255)
    private String targetAudience;

    @Size(max = 120)
    private String primaryPersona;

    @Size(max = 120)
    private String territoryFocus;

    @Min(0)
    @Max(100)
    private Integer minLeadScore;

    @Min(0)
    private BigDecimal minEstimatedValue;

    @Min(0)
    private BigDecimal maxEstimatedValue;

    @Size(max = 120)
    private String titleKeyword;

    @Size(max = 120)
    private String companyKeyword;

    private String[] sourceFilters;

    private String[] statusFilters;

    @NotNull
    private Boolean includeCampaignAttributedOnly;

    @NotNull
    private Boolean isActive;

    @Size(max = 2000)
    private String notes;
}
