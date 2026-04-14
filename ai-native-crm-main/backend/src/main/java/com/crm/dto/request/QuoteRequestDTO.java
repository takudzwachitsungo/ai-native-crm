package com.crm.dto.request;

import com.crm.entity.enums.QuoteStatus;
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
public class QuoteRequestDTO {
    
    @NotBlank(message = "Quote number is required")
    @Size(max = 50, message = "Quote number must be less than 50 characters")
    private String quoteNumber;
    
    @NotNull(message = "Company is required")
    private UUID companyId;
    
    private UUID contactId;
    
    @NotNull(message = "Issue date is required")
    private LocalDate issueDate;
    
    @NotNull(message = "Valid until date is required")
    private LocalDate validUntil;
    
    @NotNull(message = "Status is required")
    private QuoteStatus status;
    
    private String notes;
    
    private String terms;
    
    private BigDecimal taxRate;
    
    private BigDecimal discountAmount;
    
    private UUID ownerId;
    
    @NotNull(message = "Line items are required")
    private List<QuoteLineItemRequestDTO> lineItems;
}
