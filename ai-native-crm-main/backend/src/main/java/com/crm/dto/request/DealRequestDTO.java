package com.crm.dto.request;

import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.DealType;
import com.crm.entity.enums.LeadSource;
import jakarta.validation.constraints.*;
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
public class DealRequestDTO {
    
    @NotBlank(message = "Deal name is required")
    @Size(max = 200, message = "Name must be less than 200 characters")
    private String name;
    
    private UUID companyId;
    
    private UUID contactId;
    
    @NotNull(message = "Deal value is required")
    @DecimalMin(value = "0.0", message = "Value must be positive")
    private BigDecimal value;
    
    @NotNull(message = "Stage is required")
    private DealStage stage;
    
    @Min(value = 0, message = "Probability must be between 0 and 100")
    @Max(value = 100, message = "Probability must be between 0 and 100")
    private Integer probability;
    
    private LocalDate expectedCloseDate;
    
    private LocalDate actualCloseDate;
    
    private DealType dealType;
    
    private LeadSource leadSource;

    private String territory;
    
    private String description;
    
    private String notes;

    private String competitorName;

    private String nextStep;

    private LocalDate nextStepDueDate;

    private String buyingCommitteeSummary;

    private DealRiskLevel riskLevel;

    private String winReason;

    private String lossReason;

    private String closeNotes;
    
    private UUID ownerId;
}
