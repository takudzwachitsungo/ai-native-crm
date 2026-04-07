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
public class SupportCaseSlaAutomationResultDTO {

    private Integer reviewedCases;
    private Integer responseTasksCreated;
    private Integer resolutionTasksCreated;
    private Integer escalationTasksCreated;
    private Integer escalatedCases;
    private Integer alreadyCoveredCases;
    private List<UUID> createdTaskIds;
}
