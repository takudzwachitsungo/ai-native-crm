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
public class SupportCaseAssignmentAutomationResultDTO {

    private Integer reviewedCases;
    private Integer assignedCases;
    private Integer assignmentTasksCreated;
    private Integer skippedCases;
    private List<UUID> updatedCaseIds;
    private List<UUID> createdTaskIds;
}
