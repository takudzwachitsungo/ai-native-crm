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
public class DealAutomationResultDTO {

    private int reviewedDeals;
    private int rescueTasksCreated;
    private int alreadyCoveredDeals;
    private List<UUID> createdTaskIds;
}
