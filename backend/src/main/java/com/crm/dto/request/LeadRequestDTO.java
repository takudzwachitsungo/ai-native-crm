package com.crm.dto.request;

import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.LeadStatus;
import jakarta.validation.constraints.*;
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
public class LeadRequestDTO {
    
    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must be less than 100 characters")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must be less than 100 characters")
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @Size(max = 20, message = "Phone must be less than 20 characters")
    private String phone;
    
    @Size(max = 200, message = "Company name must be less than 200 characters")
    private String company;
    
    @Size(max = 100, message = "Title must be less than 100 characters")
    private String title;
    
    private LeadSource source;
    
    private LeadStatus status;
    
    @Min(value = 0, message = "Score must be between 0 and 100")
    @Max(value = 100, message = "Score must be between 0 and 100")
    private Integer score;
    
    @DecimalMin(value = "0.0", message = "Estimated value must be positive")
    private BigDecimal estimatedValue;
    
    private String notes;
    
    private List<String> tags;
    
    private LocalDate lastContactDate;
    
    private UUID ownerId;
}
