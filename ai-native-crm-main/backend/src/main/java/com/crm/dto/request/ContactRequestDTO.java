package com.crm.dto.request;

import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import com.crm.entity.enums.InfluenceLevel;
import com.crm.entity.enums.PreferredContactMethod;
import com.crm.entity.enums.StakeholderRole;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactRequestDTO {
    
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
    
    @Size(max = 20, message = "Mobile must be less than 20 characters")
    private String mobile;
    
    @Size(max = 100, message = "Title must be less than 100 characters")
    private String title;

    @Size(max = 100, message = "Department must be less than 100 characters")
    private String department;

    private Boolean isPrimary;

    private StakeholderRole stakeholderRole;

    private InfluenceLevel influenceLevel;

    private PreferredContactMethod preferredContactMethod;
    
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
    
    @Size(max = 200, message = "LinkedIn URL must be less than 200 characters")
    private String linkedinUrl;
    
    @Size(max = 200, message = "Twitter URL must be less than 200 characters")
    private String twitterUrl;
    
    private ContactStatus status;
    
    private LocalDate lastContactDate;
    
    private String notes;
    
    private UUID companyId;

    private UUID reportsToId;

    private Boolean marketingConsent;

    private LocalDateTime consentCapturedAt;

    @Size(max = 120, message = "Consent source must be less than 120 characters")
    private String consentSource;

    private CustomerPrivacyStatus privacyStatus;

    @Min(value = 0, message = "Data quality score must be between 0 and 100")
    @Max(value = 100, message = "Data quality score must be between 0 and 100")
    private Integer dataQualityScore;

    private DataEnrichmentStatus enrichmentStatus;

    private LocalDateTime enrichmentLastCheckedAt;
}
