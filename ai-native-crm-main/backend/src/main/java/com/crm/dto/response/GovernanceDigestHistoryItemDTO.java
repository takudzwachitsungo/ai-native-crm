package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernanceDigestHistoryItemDTO {

    private UUID taskId;
    private String title;
    private String status;
    private String priority;
    private String assignedToName;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
}
