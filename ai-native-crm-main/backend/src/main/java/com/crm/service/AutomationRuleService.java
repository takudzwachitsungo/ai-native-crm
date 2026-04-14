package com.crm.service;

import com.crm.dto.request.AutomationRuleRequestDTO;
import com.crm.dto.response.AutomationRuleResponseDTO;
import com.crm.entity.AutomationRule;
import com.crm.entity.enums.AutomationEventType;

import java.util.List;
import java.util.UUID;

public interface AutomationRuleService {

    List<AutomationRuleResponseDTO> findAll();

    AutomationRuleResponseDTO findById(UUID id);

    List<AutomationRuleResponseDTO> findByEventType(AutomationEventType eventType, boolean activeOnly);

    AutomationRuleResponseDTO create(AutomationRuleRequestDTO request);

    AutomationRuleResponseDTO update(UUID id, AutomationRuleRequestDTO request);

    void delete(UUID id);

    List<AutomationRule> resolveActiveRules(UUID tenantId, AutomationEventType eventType);
}
