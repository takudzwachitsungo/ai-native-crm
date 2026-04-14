package com.crm.dto.request;

import com.crm.entity.enums.CompanyStatus;
import com.crm.entity.enums.Industry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyFilterDTO {
    
    private String search;
    private Industry industry;
    private CompanyStatus status;
    private BigDecimal minRevenue;
    private BigDecimal maxRevenue;
    private Integer minEmployeeCount;
    private Integer maxEmployeeCount;
    private String city;
    private String state;
    private String country;
    private UUID ownerId;
}
