package com.crm.dto.response;

import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSlaStatus;
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
public class SupportCaseAssignmentQueueItemDTO {

    private UUID caseId;
    private String caseNumber;
    private String title;
    private SupportCaseStatus status;
    private SupportCasePriority priority;
    private SupportCaseCustomerTier customerTier;
    private SupportCaseType caseType;
    private SupportCaseQueue supportQueue;
    private String companyName;
    private UUID ownerId;
    private String ownerName;
    private UUID suggestedOwnerId;
    private String suggestedOwnerName;
    private String suggestedReason;
    private String recommendedAction;
    private String queueReason;
    private SupportCaseSlaStatus responseSlaStatus;
    private SupportCaseSlaStatus resolutionSlaStatus;
    private LocalDateTime createdAt;
}
