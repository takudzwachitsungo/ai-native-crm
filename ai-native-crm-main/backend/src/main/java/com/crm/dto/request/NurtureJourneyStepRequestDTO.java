package com.crm.dto.request;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.TaskPriority;
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
public class NurtureJourneyStepRequestDTO {

    @NotBlank
    @Size(max = 150)
    private String name;

    @NotNull
    @Min(1)
    @Max(50)
    private Integer sequenceOrder;

    @NotNull
    @Min(0)
    @Max(60)
    private Integer waitDays;

    @NotNull
    private CampaignChannel channel;

    @NotNull
    private TaskPriority taskPriority;

    @Size(max = 255)
    private String objective;

    @Size(max = 255)
    private String taskTitleTemplate;

    @Size(max = 2000)
    private String taskDescriptionTemplate;

    @Size(max = 255)
    private String callToAction;

    @NotNull
    private Boolean isActive;
}
