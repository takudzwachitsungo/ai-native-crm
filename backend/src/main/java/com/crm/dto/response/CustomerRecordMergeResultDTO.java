package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRecordMergeResultDTO {

    private UUID targetContactId;
    private UUID archivedSourceContactId;
    private Integer movedDeals;
    private Integer movedQuotes;
    private Integer movedInvoices;
    private Integer movedContracts;
    private Integer movedCases;
    private Integer movedTasks;
    private Integer updatedReportsToContacts;
    private String detail;
}
