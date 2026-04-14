package com.crm.service;

import com.crm.entity.Deal;
import com.crm.entity.Lead;
import com.crm.entity.SupportCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationExecutionTargets {

    private Lead lead;
    private Deal deal;
    private SupportCase supportCase;
}
