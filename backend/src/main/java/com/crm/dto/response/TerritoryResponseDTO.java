package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryResponseDTO {

    private UUID id;
    private String name;
    private String description;
    private Boolean isActive;
    private Long assignedUserCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
