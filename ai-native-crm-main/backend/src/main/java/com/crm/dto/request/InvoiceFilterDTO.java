package com.crm.dto.request;

import com.crm.entity.enums.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceFilterDTO {
    
    private String search;
    private InvoiceStatus status;
    private UUID companyId;
    private UUID contactId;
    private LocalDate issueDateFrom;
    private LocalDate issueDateTo;
    private LocalDate dueDateFrom;
    private LocalDate dueDateTo;
    private Boolean overdueOnly;
    private UUID ownerId;
}
