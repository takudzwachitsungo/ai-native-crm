package com.crm.dto.request;

import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.LeadStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadFilterDTO {
    
    private String search;
    private LeadStatus status;
    private LeadSource source;
    private Integer minScore;
    private Integer maxScore;
    private BigDecimal minEstimatedValue;
    private BigDecimal maxEstimatedValue;
    private LocalDate lastContactDateFrom;
    private LocalDate lastContactDateTo;
    private UUID ownerId;
    private List<String> tags;
}
