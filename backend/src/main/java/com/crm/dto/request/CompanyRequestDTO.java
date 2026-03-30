package com.crm.dto.request;

import com.crm.entity.enums.CompanyStatus;
import com.crm.entity.enums.Industry;
import jakarta.validation.constraints.*;
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
public class CompanyRequestDTO {
    
    @NotBlank(message = "Company name is required")
    @Size(max = 200, message = "Name must be less than 200 characters")
    private String name;
    
    private Industry industry;
    
    @Size(max = 200, message = "Website must be less than 200 characters")
    private String website;
    
    @Size(max = 20, message = "Phone must be less than 20 characters")
    private String phone;
    
    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email must be less than 150 characters")
    private String email;
    
    @DecimalMin(value = "0.0", message = "Revenue must be positive")
    private BigDecimal revenue;
    
    @Min(value = 0, message = "Employee count must be positive")
    private Integer employeeCount;
    
    @Size(max = 200, message = "Address must be less than 200 characters")
    private String address;
    
    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;
    
    @Size(max = 100, message = "State must be less than 100 characters")
    private String state;
    
    @Size(max = 20, message = "Postal code must be less than 20 characters")
    private String postalCode;
    
    @Size(max = 100, message = "Country must be less than 100 characters")
    private String country;

    @Size(max = 120, message = "Territory must be less than 120 characters")
    private String territory;
    
    private CompanyStatus status;
    
    private String notes;
    
    private UUID ownerId;

    private UUID parentCompanyId;
}
