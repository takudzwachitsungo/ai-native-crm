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
public class FieldTechnicianWorkloadDTO {

    private UUID technicianId;
    private String technicianName;
    private String territory;
    private Long activeWorkOrders;
    private Long scheduledWorkOrders;
    private Long urgentWorkOrders;
}
