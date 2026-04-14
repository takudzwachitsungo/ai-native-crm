package com.crm.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceIntegrationUpdateRequestDTO {

    @Size(max = 40)
    private String authType;

    @Size(max = 500)
    private String baseUrl;

    @Size(max = 255)
    private String clientId;

    @Size(max = 1000)
    private String clientSecret;

    @Size(max = 255)
    private String accountIdentifier;

    @Size(max = 500)
    private String redirectUri;

    @Size(max = 1000)
    private String scopes;

    private Boolean syncEnabled;

    private Boolean active;
}
