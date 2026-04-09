package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingPortalResponseDTO {

    private String tenantName;
    private String tenantSlug;
    private String tenantTier;
    private Boolean portalEnabled;
    private String portalUrl;
    private String detail;
}
