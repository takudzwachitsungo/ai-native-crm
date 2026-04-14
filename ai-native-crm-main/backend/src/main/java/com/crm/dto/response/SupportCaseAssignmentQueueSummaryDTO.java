package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.crm.entity.enums.SupportCaseQueue;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseAssignmentQueueSummaryDTO {

    private Integer totalItems;
    private Integer unassignedCases;
    private Integer escalatedCases;
    private Integer urgentCases;
    private Integer breachedCases;
    private Map<SupportCaseQueue, Long> casesByQueue;
    private List<SupportCaseAssignmentQueueItemDTO> items;
}
