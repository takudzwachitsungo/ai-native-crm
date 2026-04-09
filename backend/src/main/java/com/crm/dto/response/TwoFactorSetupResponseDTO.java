package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorSetupResponseDTO {

    private Boolean enabled;
    private Boolean pendingVerification;
    private String issuer;
    private String manualEntryKey;
    private String otpauthUri;
}
