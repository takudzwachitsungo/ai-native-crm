package com.crm.dto.request;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRevenueOpsUpdateRequestDTO {

    @Size(max = 120, message = "Territory must be less than 120 characters")
    private String territory;

    @PositiveOrZero(message = "Quarterly quota must be zero or positive")
    private BigDecimal quarterlyQuota;

    @PositiveOrZero(message = "Annual quota must be zero or positive")
    private BigDecimal annualQuota;
}
