package com.crm.dto.request;

import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.AutomationExecutionMode;
import com.crm.entity.enums.AutomationModule;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutomationRuleRequestDTO {

    @NotBlank
    @Size(max = 120)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull
    private AutomationModule module;

    @NotNull
    private AutomationEventType eventType;

    @NotNull
    private AutomationExecutionMode executionMode;

    @NotBlank
    private String conditionsJson;

    @NotBlank
    private String actionsJson;

    @NotNull
    @Min(1)
    @Max(100)
    private Integer priorityOrder;

    @NotNull
    private Boolean isActive;
}
