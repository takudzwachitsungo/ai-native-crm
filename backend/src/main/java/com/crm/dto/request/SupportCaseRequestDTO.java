package com.crm.dto.request;

import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSource;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class SupportCaseRequestDTO {

    @NotBlank(message = "Case title is required")
    @Size(max = 255, message = "Case title must be less than 255 characters")
    private String title;

    @NotNull(message = "Case status is required")
    private SupportCaseStatus status;

    @NotNull(message = "Case priority is required")
    private SupportCasePriority priority;

    @NotNull(message = "Case source is required")
    private SupportCaseSource source;

    @NotNull(message = "Customer tier is required")
    private SupportCaseCustomerTier customerTier;

    private SupportCaseType caseType;

    private SupportCaseQueue supportQueue;

    private UUID companyId;

    private UUID contactId;

    private UUID ownerId;

    private LocalDateTime responseDueAt;

    private LocalDateTime resolutionDueAt;

    @Size(max = 255, message = "Customer impact must be less than 255 characters")
    private String customerImpact;

    private String description;

    private String resolutionSummary;
}
