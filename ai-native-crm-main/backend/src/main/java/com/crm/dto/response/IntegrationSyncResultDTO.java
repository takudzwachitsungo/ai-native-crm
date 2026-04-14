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
public class IntegrationSyncResultDTO {

    private String providerKey;
    private String entityType;
    private Integer fetchedCount;
    private Integer importedCount;
    private Integer updatedCount;
    private Integer skippedCount;
    private String summary;
    private LocalDateTime syncedAt;
}
