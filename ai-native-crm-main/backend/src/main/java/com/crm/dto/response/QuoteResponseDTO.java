package com.crm.dto.response;

import com.crm.entity.enums.QuoteStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String quoteNumber;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private LocalDate issueDate;
    private LocalDate validUntil;
    private QuoteStatus status;
    private String notes;
    private String terms;
    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal total;
    private UUID ownerId;
    private String ownerName;
    private Boolean pricingApprovalRequired;
    private String pricingApprovalReason;
    private LocalDateTime pricingApprovedAt;
    private UUID pricingApprovedBy;
    private List<QuoteLineItemResponseDTO> lineItems;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
