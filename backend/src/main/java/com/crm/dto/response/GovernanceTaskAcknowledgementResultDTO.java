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
public class GovernanceTaskAcknowledgementResultDTO {

    private UUID taskId;
    private String relatedEntityType;
    private Boolean acknowledged;
    private String previousStatus;
    private String newStatus;
}
