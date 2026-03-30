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
public class GovernanceAutomationResultDTO {

    private Integer reviewedItems;
    private Integer digestsCreated;
    private Integer overdueTasksEscalated;
    private Integer escalationTasksCreated;
    private Integer alreadyCoveredEscalations;
    private List<UUID> createdTaskIds;
}
