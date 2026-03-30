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
public class TenantDatabaseSettingsUpdateRequestDTO {

    private Boolean dedicatedDatabaseEnabled;

    @Size(max = 500, message = "Database URL must be less than 500 characters")
    private String databaseUrl;

    @Size(max = 255, message = "Database username must be less than 255 characters")
    private String databaseUsername;

    @Size(max = 255, message = "Database password must be less than 255 characters")
    private String databasePassword;

    @Size(max = 255, message = "Database driver class name must be less than 255 characters")
    private String databaseDriverClassName;
}
