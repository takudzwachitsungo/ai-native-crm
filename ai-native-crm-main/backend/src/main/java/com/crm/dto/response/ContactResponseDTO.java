package com.crm.dto.response;

import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import com.crm.entity.enums.InfluenceLevel;
import com.crm.entity.enums.PreferredContactMethod;
import com.crm.entity.enums.StakeholderRole;
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
public class ContactResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String mobile;
    private String title;
    private String department;
    private Boolean isPrimary;
    private StakeholderRole stakeholderRole;
    private InfluenceLevel influenceLevel;
    private PreferredContactMethod preferredContactMethod;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String linkedinUrl;
    private String twitterUrl;
    private ContactStatus status;
    private LocalDate lastContactDate;
    private String notes;
    private UUID companyId;
    private String companyName;
    private UUID reportsToId;
    private String reportsToName;
    private Boolean marketingConsent;
    private LocalDateTime consentCapturedAt;
    private String consentSource;
    private CustomerPrivacyStatus privacyStatus;
    private Integer dataQualityScore;
    private DataEnrichmentStatus enrichmentStatus;
    private LocalDateTime enrichmentLastCheckedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
