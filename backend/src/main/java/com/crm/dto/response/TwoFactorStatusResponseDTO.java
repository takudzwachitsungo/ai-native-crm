package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorStatusResponseDTO {

    private Boolean enabled;
    private Boolean pendingVerification;
    private String issuer;
    private LocalDateTime enabledAt;
}
