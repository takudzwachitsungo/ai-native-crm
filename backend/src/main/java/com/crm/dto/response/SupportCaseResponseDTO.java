package com.crm.dto.response;

import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSlaStatus;
import com.crm.entity.enums.SupportCaseSource;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String caseNumber;
    private String title;
    private SupportCaseStatus status;
    private SupportCasePriority priority;
    private SupportCaseCustomerTier customerTier;
    private SupportCaseType caseType;
    private SupportCaseQueue supportQueue;
    private SupportCaseSource source;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private UUID ownerId;
    private String ownerName;
    private LocalDateTime responseDueAt;
    private LocalDateTime firstRespondedAt;
    private LocalDateTime resolutionDueAt;
    private LocalDateTime resolvedAt;
    private Boolean overdueResponse;
    private Boolean overdueResolution;
    private SupportCaseSlaStatus responseSlaStatus;
    private SupportCaseSlaStatus resolutionSlaStatus;
    private String customerImpact;
    private String description;
    private String resolutionSummary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
