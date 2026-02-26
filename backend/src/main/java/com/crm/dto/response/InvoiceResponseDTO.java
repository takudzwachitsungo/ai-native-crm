package com.crm.dto.response;

import com.crm.entity.enums.InvoiceStatus;
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
public class InvoiceResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String invoiceNumber;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private InvoiceStatus status;
    private LocalDate paidDate;
    private String notes;
    private String terms;
    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal total;
    private UUID ownerId;
    private String ownerName;
    private Boolean isOverdue;
    private List<InvoiceLineItemResponseDTO> lineItems;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
