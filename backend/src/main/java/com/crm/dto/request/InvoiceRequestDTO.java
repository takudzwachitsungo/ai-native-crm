package com.crm.dto.request;

import com.crm.entity.enums.InvoiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class InvoiceRequestDTO {
    
    @NotBlank(message = "Invoice number is required")
    @Size(max = 50, message = "Invoice number must be less than 50 characters")
    private String invoiceNumber;
    
    @NotNull(message = "Company is required")
    private UUID companyId;
    
    private UUID contactId;
    
    @NotNull(message = "Issue date is required")
    private LocalDate issueDate;
    
    @NotNull(message = "Due date is required")
    private LocalDate dueDate;
    
    @NotNull(message = "Status is required")
    private InvoiceStatus status;
    
    private LocalDate paidDate;
    
    private String notes;
    
    private String terms;
    
    private BigDecimal taxRate;
    
    private BigDecimal discountAmount;
    
    private UUID ownerId;
    
    @NotNull(message = "Line items are required")
    private List<InvoiceLineItemRequestDTO> lineItems;
}
