package com.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class QuoteToContractRequestDTO {

    @NotBlank(message = "Contract number is required")
    @Size(max = 50, message = "Contract number must be less than 50 characters")
    private String contractNumber;

    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private Boolean autoRenew;

    private Integer renewalNoticeDays;

    private UUID ownerId;

    private String notes;
}
