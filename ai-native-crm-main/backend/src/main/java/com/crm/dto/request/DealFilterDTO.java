package com.crm.dto.request;

import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.DealType;
import com.crm.entity.enums.LeadSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealFilterDTO {
    
    private String search;
    private DealStage stage;
    private DealType dealType;
    private LeadSource leadSource;
    private BigDecimal minValue;
    private BigDecimal maxValue;
    private Integer minProbability;
    private Integer maxProbability;
    private LocalDate expectedCloseDateFrom;
    private LocalDate expectedCloseDateTo;
    private UUID companyId;
    private UUID contactId;
    private UUID ownerId;
}
