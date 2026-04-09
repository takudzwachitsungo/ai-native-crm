package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntegrationStatusResponseDTO {

    private String key;
    private String name;
    private String category;
    private String providerType;
    private String status;
    private String description;
    private String detail;
}
