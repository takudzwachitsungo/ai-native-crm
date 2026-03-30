package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernanceDigestAutomationResultDTO {

    private Integer reviewedItems;
    private Integer digestsCreated;
    private Integer alreadyCoveredDigests;
    private List<UUID> createdTaskIds;
}
