package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.AutomationRuleRequestDTO;
import com.crm.dto.response.AutomationRuleResponseDTO;
import com.crm.entity.AutomationRule;
import com.crm.entity.enums.AutomationEventType;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.AutomationRuleRepository;
import com.crm.service.AutomationRuleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AutomationRuleServiceImpl implements AutomationRuleService {

    private final AutomationRuleRepository automationRuleRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<AutomationRuleResponseDTO> findAll() {
        UUID tenantId = requireTenant();
        return automationRuleRepository.findByTenantIdAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(tenantId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AutomationRuleResponseDTO findById(UUID id) {
        UUID tenantId = requireTenant();
        return toDto(findEntity(id, tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AutomationRuleResponseDTO> findByEventType(AutomationEventType eventType, boolean activeOnly) {
        UUID tenantId = requireTenant();
        List<AutomationRule> rules = activeOnly
                ? automationRuleRepository.findByTenantIdAndEventTypeAndIsActiveTrueAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(tenantId, eventType)
                : automationRuleRepository.findByTenantIdAndEventTypeAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(tenantId, eventType);
        return rules.stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public AutomationRuleResponseDTO create(AutomationRuleRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);

        AutomationRule rule = AutomationRule.builder()
                .name(normalizeName(request.getName()))
                .description(normalizeDescription(request.getDescription()))
                .module(request.getModule())
                .eventType(request.getEventType())
                .executionMode(request.getExecutionMode())
                .conditionsJson(normalizeJson(request.getConditionsJson(), "conditions"))
                .actionsJson(normalizeJson(request.getActionsJson(), "actions"))
                .priorityOrder(request.getPriorityOrder())
                .isActive(request.getIsActive())
                .build();
        rule.setTenantId(tenantId);
        rule.setArchived(false);
        return toDto(automationRuleRepository.save(rule));
    }

    @Override
    @Transactional
    public AutomationRuleResponseDTO update(UUID id, AutomationRuleRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);

        AutomationRule rule = findEntity(id, tenantId);
        rule.setName(normalizeName(request.getName()));
        rule.setDescription(normalizeDescription(request.getDescription()));
        rule.setModule(request.getModule());
        rule.setEventType(request.getEventType());
        rule.setExecutionMode(request.getExecutionMode());
        rule.setConditionsJson(normalizeJson(request.getConditionsJson(), "conditions"));
        rule.setActionsJson(normalizeJson(request.getActionsJson(), "actions"));
        rule.setPriorityOrder(request.getPriorityOrder());
        rule.setIsActive(request.getIsActive());
        return toDto(automationRuleRepository.save(rule));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = requireTenant();
        AutomationRule rule = findEntity(id, tenantId);
        rule.setArchived(true);
        automationRuleRepository.save(rule);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AutomationRule> resolveActiveRules(UUID tenantId, AutomationEventType eventType) {
        if (tenantId == null) {
            return List.of();
        }
        return automationRuleRepository.findByTenantIdAndEventTypeAndIsActiveTrueAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(
                tenantId,
                eventType
        );
    }

    private AutomationRule findEntity(UUID id, UUID tenantId) {
        return automationRuleRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Automation rule", id));
    }

    private AutomationRuleResponseDTO toDto(AutomationRule rule) {
        return AutomationRuleResponseDTO.builder()
                .id(rule.getId())
                .tenantId(rule.getTenantId())
                .name(rule.getName())
                .description(rule.getDescription())
                .module(rule.getModule())
                .eventType(rule.getEventType())
                .executionMode(rule.getExecutionMode())
                .conditionsJson(rule.getConditionsJson())
                .actionsJson(rule.getActionsJson())
                .priorityOrder(rule.getPriorityOrder())
                .isActive(rule.getIsActive())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private void validateRequest(AutomationRuleRequestDTO request) {
        normalizeJson(request.getConditionsJson(), "conditions");
        normalizeJson(request.getActionsJson(), "actions");
    }

    private String normalizeName(String value) {
        return value == null ? null : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDescription(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeJson(String value, String fieldName) {
        try {
            return objectMapper.readTree(value).toString();
        } catch (IOException ex) {
            throw new BadRequestException("Invalid " + fieldName + " JSON payload");
        }
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }
}
