package com.crm.dto.request;

import com.crm.entity.enums.ContractStatus;
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
public class ContractFilterDTO {

    private String search;
    private ContractStatus status;
    private UUID companyId;
    private UUID ownerId;
    private UUID quoteId;
    private LocalDate startDateFrom;
    private LocalDate startDateTo;
    private LocalDate endDateFrom;
    private LocalDate endDateTo;
}
