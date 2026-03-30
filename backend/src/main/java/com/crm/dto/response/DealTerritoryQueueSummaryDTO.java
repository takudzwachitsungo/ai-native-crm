package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealTerritoryQueueSummaryDTO {

    private Long mismatchCount;
    private Long highPriorityCount;
    private List<DealTerritoryQueueItemDTO> deals;
}
