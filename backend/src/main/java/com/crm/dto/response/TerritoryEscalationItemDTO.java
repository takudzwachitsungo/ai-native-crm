package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryEscalationItemDTO {

    private String territory;
    private UUID suggestedOwnerId;
    private String suggestedOwnerName;
    private String suggestedOwnerTerritory;
    private Long totalExceptions;
    private Long leadExceptions;
    private Long companyExceptions;
    private Long dealExceptions;
    private Long highSeverityCount;
    private Long repeatedMismatchCount;
    private BigDecimal pipelineExposure;
    private String escalationLevel;
    private Long oldestMismatchAgeDays;
    private Boolean slaBreached;
    private Boolean openAlertExists;
    private UUID openTaskId;
    private String openTaskStatus;
}
