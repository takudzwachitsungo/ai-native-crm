package com.crm.dto.response;

import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDuplicateRecordDTO {

    private UUID id;
    private String recordType;
    private String displayName;
    private String email;
    private String phone;
    private String companyName;
    private CustomerPrivacyStatus privacyStatus;
    private Integer dataQualityScore;
    private DataEnrichmentStatus enrichmentStatus;
}
