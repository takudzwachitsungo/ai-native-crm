package com.crm.dto.response;

import com.crm.entity.enums.ContractStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String contractNumber;
    private String title;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private UUID quoteId;
    private String quoteNumber;
    private UUID ownerId;
    private String ownerName;
    private String territory;
    private ContractStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate renewalDate;
    private Boolean autoRenew;
    private Integer renewalNoticeDays;
    private BigDecimal contractValue;
    private UUID renewalInvoiceId;
    private LocalDateTime renewalInvoiceGeneratedAt;
    private UUID renewedFromContractId;
    private UUID renewedToContractId;
    private LocalDateTime activatedAt;
    private LocalDateTime terminatedAt;
    private String terminationReason;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
