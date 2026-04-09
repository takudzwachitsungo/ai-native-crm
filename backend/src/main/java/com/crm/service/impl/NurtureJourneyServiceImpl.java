package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.NurtureJourneyRequestDTO;
import com.crm.dto.response.NurtureJourneyResponseDTO;
import com.crm.entity.NurtureJourney;
import com.crm.entity.NurtureJourneyStep;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CampaignRepository;
import com.crm.repository.NurtureJourneyRepository;
import com.crm.repository.NurtureJourneyStepRepository;
import com.crm.service.NurtureJourneyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NurtureJourneyServiceImpl implements NurtureJourneyService {

    private final NurtureJourneyRepository nurtureJourneyRepository;
    private final CampaignRepository campaignRepository;
    private final NurtureJourneyStepRepository nurtureJourneyStepRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NurtureJourneyResponseDTO> findAll() {
        UUID tenantId = requireTenant();
        return nurtureJourneyRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId).stream()
                .map(journey -> toDto(journey, tenantId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NurtureJourneyResponseDTO findById(UUID id) {
        UUID tenantId = requireTenant();
        return toDto(findEntity(id, tenantId), tenantId);
    }

    @Override
    @Transactional
    public NurtureJourneyResponseDTO create(NurtureJourneyRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);
        NurtureJourney journey = NurtureJourney.builder()
                .name(normalize(request.getName()))
                .description(normalizeNullable(request.getDescription()))
                .journeyStage(request.getJourneyStage())
                .autoEnrollNewLeads(request.getAutoEnrollNewLeads())
                .defaultCadenceDays(request.getDefaultCadenceDays())
                .defaultTouchCount(request.getDefaultTouchCount())
                .defaultCallToAction(normalizeNullable(request.getDefaultCallToAction()))
                .successMetric(normalizeNullable(request.getSuccessMetric()))
                .isActive(request.getIsActive())
                .notes(normalizeNullable(request.getNotes()))
                .build();
        journey.setTenantId(tenantId);
        journey.setArchived(false);
        return toDto(nurtureJourneyRepository.save(journey), tenantId);
    }

    @Override
    @Transactional
    public NurtureJourneyResponseDTO update(UUID id, NurtureJourneyRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);
        NurtureJourney journey = findEntity(id, tenantId);
        journey.setName(normalize(request.getName()));
        journey.setDescription(normalizeNullable(request.getDescription()));
        journey.setJourneyStage(request.getJourneyStage());
        journey.setAutoEnrollNewLeads(request.getAutoEnrollNewLeads());
        journey.setDefaultCadenceDays(request.getDefaultCadenceDays());
        journey.setDefaultTouchCount(request.getDefaultTouchCount());
        journey.setDefaultCallToAction(normalizeNullable(request.getDefaultCallToAction()));
        journey.setSuccessMetric(normalizeNullable(request.getSuccessMetric()));
        journey.setIsActive(request.getIsActive());
        journey.setNotes(normalizeNullable(request.getNotes()));
        return toDto(nurtureJourneyRepository.save(journey), tenantId);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = requireTenant();
        NurtureJourney journey = findEntity(id, tenantId);
        journey.setArchived(true);
        nurtureJourneyRepository.save(journey);
        nurtureJourneyStepRepository.findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(id, tenantId)
                .forEach(step -> {
                    step.setArchived(true);
                    nurtureJourneyStepRepository.save(step);
                });
    }

    private void validateRequest(NurtureJourneyRequestDTO request) {
        if (request.getAutoEnrollNewLeads() == null || request.getIsActive() == null) {
            throw new BadRequestException("Journey activation fields are required");
        }
        if (Boolean.TRUE.equals(request.getAutoEnrollNewLeads())
                && (request.getDefaultCadenceDays() == null || request.getDefaultTouchCount() == null)) {
            throw new BadRequestException("Auto-enroll journeys require cadence and touch count");
        }
    }

    private NurtureJourney findEntity(UUID id, UUID tenantId) {
        return nurtureJourneyRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurture journey", id));
    }

    private NurtureJourneyResponseDTO toDto(NurtureJourney journey, UUID tenantId) {
        List<NurtureJourneyStep> steps = nurtureJourneyStepRepository.findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(journey.getId(), tenantId);
        NurtureJourneyStep firstActiveStep = steps.stream()
                .filter(step -> Boolean.TRUE.equals(step.getIsActive()))
                .findFirst()
                .orElse(null);
        return NurtureJourneyResponseDTO.builder()
                .id(journey.getId())
                .tenantId(journey.getTenantId())
                .name(journey.getName())
                .description(journey.getDescription())
                .journeyStage(journey.getJourneyStage())
                .autoEnrollNewLeads(journey.getAutoEnrollNewLeads())
                .defaultCadenceDays(journey.getDefaultCadenceDays())
                .defaultTouchCount(journey.getDefaultTouchCount())
                .defaultCallToAction(journey.getDefaultCallToAction())
                .successMetric(journey.getSuccessMetric())
                .isActive(journey.getIsActive())
                .notes(journey.getNotes())
                .campaignsUsingJourney(campaignRepository.countByTenantIdAndJourneyIdAndArchivedFalse(tenantId, journey.getId()))
                .stepCount((long) steps.size())
                .firstActiveStepName(firstActiveStep != null ? firstActiveStep.getName() : null)
                .createdAt(journey.getCreatedAt())
                .updatedAt(journey.getUpdatedAt())
                .build();
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
