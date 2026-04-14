package com.crm.dto.response;

import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.UserRole;
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
public class SupportCaseOwnerWorkloadDTO {

    private UUID userId;
    private String name;
    private UserRole role;
    private String territory;
    private Long assignedActiveCases;
    private Long urgentCases;
    private Long breachedCases;
    private Long escalatedCases;
    private List<SupportCaseQueue> queuesCovered;
}
