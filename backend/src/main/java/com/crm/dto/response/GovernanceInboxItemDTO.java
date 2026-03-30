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
public class GovernanceInboxItemDTO {

    private String itemType;
    private String title;
    private String severity;
    private String territory;
    private String ownerName;
    private Long ageDays;
    private Boolean slaBreached;
    private Boolean openTaskExists;
    private UUID openTaskId;
    private String openTaskStatus;
    private String summary;
}
