package com.crm.dto.request;

import com.crm.entity.enums.QuoteStatus;
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
public class QuoteFilterDTO {
    
    private String search;
    private QuoteStatus status;
    private UUID companyId;
    private UUID contactId;
    private LocalDate issueDateFrom;
    private LocalDate issueDateTo;
    private LocalDate validUntilFrom;
    private LocalDate validUntilTo;
    private UUID ownerId;
}
