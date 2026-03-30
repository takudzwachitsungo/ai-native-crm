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
public class QuotaRiskAutomationResultDTO {

    private Integer reviewedReps;
    private Integer tasksCreated;
    private Integer alreadyCoveredReps;
    private List<UUID> createdTaskIds;
}
