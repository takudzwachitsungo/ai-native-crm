package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.NurtureJourneyStepRequestDTO;
import com.crm.dto.response.NurtureJourneyStepResponseDTO;
import com.crm.entity.NurtureJourney;
import com.crm.entity.NurtureJourneyStep;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.NurtureJourneyRepository;
import com.crm.repository.NurtureJourneyStepRepository;
import com.crm.service.NurtureJourneyStepService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NurtureJourneyStepServiceImpl implements NurtureJourneyStepService {

    private final NurtureJourneyRepository nurtureJourneyRepository;
    private final NurtureJourneyStepRepository nurtureJourneyStepRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NurtureJourneyStepResponseDTO> findAll(UUID journeyId) {
        UUID tenantId = requireTenant();
        findJourney(journeyId, tenantId);
        return nurtureJourneyStepRepository.findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(journeyId, tenantId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public NurtureJourneyStepResponseDTO create(UUID journeyId, NurtureJourneyStepRequestDTO request) {
        UUID tenantId = requireTenant();
        NurtureJourney journey = findJourney(journeyId, tenantId);
        validateRequest(request);
        NurtureJourneyStep step = NurtureJourneyStep.builder()
                .journeyId(journey.getId())
                .name(normalize(request.getName()))
                .sequenceOrder(request.getSequenceOrder())
                .waitDays(request.getWaitDays())
                .channel(request.getChannel())
                .taskPriority(request.getTaskPriority())
                .objective(normalizeNullable(request.getObjective()))
                .taskTitleTemplate(normalizeNullable(request.getTaskTitleTemplate()))
                .taskDescriptionTemplate(normalizeNullable(request.getTaskDescriptionTemplate()))
                .callToAction(normalizeNullable(request.getCallToAction()))
                .isActive(request.getIsActive())
                .build();
        step.setTenantId(tenantId);
        step.setArchived(false);
        return toDto(nurtureJourneyStepRepository.save(step));
    }

    @Override
    @Transactional
    public NurtureJourneyStepResponseDTO update(UUID journeyId, UUID stepId, NurtureJourneyStepRequestDTO request) {
        UUID tenantId = requireTenant();
        findJourney(journeyId, tenantId);
        validateRequest(request);
        NurtureJourneyStep step = nurtureJourneyStepRepository.findByIdAndJourneyIdAndTenantIdAndArchivedFalse(stepId, journeyId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurture journey step", stepId));
        step.setName(normalize(request.getName()));
        step.setSequenceOrder(request.getSequenceOrder());
        step.setWaitDays(request.getWaitDays());
        step.setChannel(request.getChannel());
        step.setTaskPriority(request.getTaskPriority());
        step.setObjective(normalizeNullable(request.getObjective()));
        step.setTaskTitleTemplate(normalizeNullable(request.getTaskTitleTemplate()));
        step.setTaskDescriptionTemplate(normalizeNullable(request.getTaskDescriptionTemplate()));
        step.setCallToAction(normalizeNullable(request.getCallToAction()));
        step.setIsActive(request.getIsActive());
        return toDto(nurtureJourneyStepRepository.save(step));
    }

    @Override
    @Transactional
    public void delete(UUID journeyId, UUID stepId) {
        UUID tenantId = requireTenant();
        findJourney(journeyId, tenantId);
        NurtureJourneyStep step = nurtureJourneyStepRepository.findByIdAndJourneyIdAndTenantIdAndArchivedFalse(stepId, journeyId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurture journey step", stepId));
        step.setArchived(true);
        nurtureJourneyStepRepository.save(step);
    }

    private NurtureJourney findJourney(UUID journeyId, UUID tenantId) {
        return nurtureJourneyRepository.findByIdAndTenantIdAndArchivedFalse(journeyId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurture journey", journeyId));
    }

    private NurtureJourneyStepResponseDTO toDto(NurtureJourneyStep step) {
        return NurtureJourneyStepResponseDTO.builder()
                .id(step.getId())
                .tenantId(step.getTenantId())
                .journeyId(step.getJourneyId())
                .name(step.getName())
                .sequenceOrder(step.getSequenceOrder())
                .waitDays(step.getWaitDays())
                .channel(step.getChannel())
                .taskPriority(step.getTaskPriority())
                .objective(step.getObjective())
                .taskTitleTemplate(step.getTaskTitleTemplate())
                .taskDescriptionTemplate(step.getTaskDescriptionTemplate())
                .callToAction(step.getCallToAction())
                .isActive(step.getIsActive())
                .createdAt(step.getCreatedAt())
                .updatedAt(step.getUpdatedAt())
                .build();
    }

    private void validateRequest(NurtureJourneyStepRequestDTO request) {
        if (request.getIsActive() == null) {
            throw new BadRequestException("Journey step activation is required");
        }
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : normalize(value);
    }
}
