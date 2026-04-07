package com.crm.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationExecutionOutcome {

    private int reviewedRules;
    private int matchedRules;
    private int actionsExecuted;
    @Builder.Default
    private List<UUID> createdTaskIds = new ArrayList<>();
    private boolean mutatedTarget;
}
