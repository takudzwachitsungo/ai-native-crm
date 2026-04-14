package com.crm.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealApprovalActionRequestDTO {

    @Size(max = 2000, message = "Approval notes must be less than 2000 characters")
    private String notes;
}
