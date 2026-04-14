package com.crm.dto.request;

import com.crm.entity.enums.ContractStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractRequestDTO {

    @NotBlank(message = "Contract number is required")
    @Size(max = 50, message = "Contract number must be less than 50 characters")
    private String contractNumber;

    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;

    @NotNull(message = "Company is required")
    private UUID companyId;

    private UUID contactId;

    private UUID quoteId;

    private UUID ownerId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private Boolean autoRenew;

    private Integer renewalNoticeDays;

    @DecimalMin(value = "0.0", message = "Contract value must be non-negative")
    private BigDecimal contractValue;

    private ContractStatus status;

    private String terminationReason;

    private String notes;
}
