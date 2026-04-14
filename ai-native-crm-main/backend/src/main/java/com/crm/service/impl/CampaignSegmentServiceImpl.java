package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.CampaignSegmentRequestDTO;
import com.crm.dto.response.CampaignSegmentPreviewDTO;
import com.crm.dto.response.CampaignSegmentResponseDTO;
import com.crm.entity.CampaignSegment;
import com.crm.entity.Lead;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CampaignRepository;
import com.crm.repository.CampaignSegmentRepository;
import com.crm.repository.LeadRepository;
import com.crm.service.CampaignSegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignSegmentServiceImpl implements CampaignSegmentService {

    private final CampaignSegmentRepository campaignSegmentRepository;
    private final CampaignRepository campaignRepository;
    private final LeadRepository leadRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CampaignSegmentResponseDTO> findAll() {
        UUID tenantId = requireTenant();
        return campaignSegmentRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId).stream()
                .map(segment -> toDto(segment, tenantId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignSegmentResponseDTO findById(UUID id) {
        UUID tenantId = requireTenant();
        return toDto(findEntity(id, tenantId), tenantId);
    }

    @Override
    @Transactional
    public CampaignSegmentResponseDTO create(CampaignSegmentRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);
        CampaignSegment segment = CampaignSegment.builder()
                .name(normalize(request.getName()))
                .description(normalizeNullable(request.getDescription()))
                .segmentType(request.getSegmentType())
                .targetAudience(normalizeNullable(request.getTargetAudience()))
                .primaryPersona(normalizeNullable(request.getPrimaryPersona()))
                .territoryFocus(normalizeNullable(request.getTerritoryFocus()))
                .minLeadScore(request.getMinLeadScore())
                .minEstimatedValue(request.getMinEstimatedValue())
                .maxEstimatedValue(request.getMaxEstimatedValue())
                .titleKeyword(normalizeNullable(request.getTitleKeyword()))
                .companyKeyword(normalizeNullable(request.getCompanyKeyword()))
                .sourceFilters(normalizeArray(request.getSourceFilters()))
                .statusFilters(normalizeArray(request.getStatusFilters()))
                .includeCampaignAttributedOnly(request.getIncludeCampaignAttributedOnly())
                .isActive(request.getIsActive())
                .notes(normalizeNullable(request.getNotes()))
                .build();
        segment.setTenantId(tenantId);
        segment.setArchived(false);
        return toDto(campaignSegmentRepository.save(segment), tenantId);
    }

    @Override
    @Transactional
    public CampaignSegmentResponseDTO update(UUID id, CampaignSegmentRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);
        CampaignSegment segment = findEntity(id, tenantId);
        segment.setName(normalize(request.getName()));
        segment.setDescription(normalizeNullable(request.getDescription()));
        segment.setSegmentType(request.getSegmentType());
        segment.setTargetAudience(normalizeNullable(request.getTargetAudience()));
        segment.setPrimaryPersona(normalizeNullable(request.getPrimaryPersona()));
        segment.setTerritoryFocus(normalizeNullable(request.getTerritoryFocus()));
        segment.setMinLeadScore(request.getMinLeadScore());
        segment.setMinEstimatedValue(request.getMinEstimatedValue());
        segment.setMaxEstimatedValue(request.getMaxEstimatedValue());
        segment.setTitleKeyword(normalizeNullable(request.getTitleKeyword()));
        segment.setCompanyKeyword(normalizeNullable(request.getCompanyKeyword()));
        segment.setSourceFilters(normalizeArray(request.getSourceFilters()));
        segment.setStatusFilters(normalizeArray(request.getStatusFilters()));
        segment.setIncludeCampaignAttributedOnly(request.getIncludeCampaignAttributedOnly());
        segment.setIsActive(request.getIsActive());
        segment.setNotes(normalizeNullable(request.getNotes()));
        return toDto(campaignSegmentRepository.save(segment), tenantId);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = requireTenant();
        CampaignSegment segment = findEntity(id, tenantId);
        segment.setArchived(true);
        campaignSegmentRepository.save(segment);
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignSegmentPreviewDTO preview(UUID id) {
        UUID tenantId = requireTenant();
        CampaignSegment segment = findEntity(id, tenantId);
        List<Lead> matchedLeads = getMatchedLeads(tenantId, segment);
        return CampaignSegmentPreviewDTO.builder()
                .segmentId(segment.getId())
                .segmentName(segment.getName())
                .matchedLeadCount((long) matchedLeads.size())
                .averageLeadScore(matchedLeads.stream()
                        .map(Lead::getScore)
                        .filter(Objects::nonNull)
                        .mapToInt(Integer::intValue)
                        .average()
                        .orElse(0.0))
                .estimatedPipelineValue(matchedLeads.stream()
                        .map(Lead::getEstimatedValue)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .leadsBySource(groupBy(matchedLeads, lead -> lead.getSource() != null ? lead.getSource().name() : "UNKNOWN"))
                .leadsByStatus(groupBy(matchedLeads, lead -> lead.getStatus() != null ? lead.getStatus().name() : "UNKNOWN"))
                .leadsByTerritory(groupBy(matchedLeads, lead -> hasText(lead.getTerritory()) ? lead.getTerritory().trim() : "Unassigned"))
                .build();
    }

    public List<Lead> getMatchedLeads(UUID tenantId, CampaignSegment segment) {
        return leadRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent().stream()
                .filter(lead -> matchesSegment(lead, segment))
                .toList();
    }

    private boolean matchesSegment(Lead lead, CampaignSegment segment) {
        if (Boolean.FALSE.equals(segment.getIsActive())) {
            return false;
        }
        if (segment.getMinLeadScore() != null) {
            int score = lead.getScore() != null ? lead.getScore() : 0;
            if (score < segment.getMinLeadScore()) {
                return false;
            }
        }
        if (segment.getMinEstimatedValue() != null) {
            BigDecimal estimatedValue = lead.getEstimatedValue() != null ? lead.getEstimatedValue() : BigDecimal.ZERO;
            if (estimatedValue.compareTo(segment.getMinEstimatedValue()) < 0) {
                return false;
            }
        }
        if (segment.getMaxEstimatedValue() != null && lead.getEstimatedValue() != null
                && lead.getEstimatedValue().compareTo(segment.getMaxEstimatedValue()) > 0) {
            return false;
        }
        if (Boolean.TRUE.equals(segment.getIncludeCampaignAttributedOnly()) && lead.getCampaignId() == null) {
            return false;
        }
        if (hasValues(segment.getSourceFilters())) {
            String source = lead.getSource() != null ? lead.getSource().name() : null;
            if (!matchesArray(source, segment.getSourceFilters())) {
                return false;
            }
        }
        if (hasValues(segment.getStatusFilters())) {
            String status = lead.getStatus() != null ? lead.getStatus().name() : null;
            if (!matchesArray(status, segment.getStatusFilters())) {
                return false;
            }
        }
        if (hasText(segment.getTerritoryFocus())) {
            if (!equalsIgnoreCaseTrim(segment.getTerritoryFocus(), lead.getTerritory())) {
                return false;
            }
        }
        if (hasText(segment.getPrimaryPersona())) {
            String title = lead.getTitle() == null ? "" : lead.getTitle().toLowerCase(Locale.ROOT);
            if (!title.contains(segment.getPrimaryPersona().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (hasText(segment.getTitleKeyword())) {
            String title = lead.getTitle() == null ? "" : lead.getTitle().toLowerCase(Locale.ROOT);
            if (!title.contains(segment.getTitleKeyword().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        if (hasText(segment.getCompanyKeyword())) {
            String company = lead.getCompany() == null ? "" : lead.getCompany().toLowerCase(Locale.ROOT);
            if (!company.contains(segment.getCompanyKeyword().trim().toLowerCase(Locale.ROOT))) {
                return false;
            }
        }
        return true;
    }

    private Map<String, Long> groupBy(List<Lead> leads, java.util.function.Function<Lead, String> classifier) {
        return leads.stream()
                .collect(Collectors.groupingBy(classifier, LinkedHashMap::new, Collectors.counting()));
    }

    private CampaignSegment findEntity(UUID id, UUID tenantId) {
        return campaignSegmentRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign segment", id));
    }

    private CampaignSegmentResponseDTO toDto(CampaignSegment segment, UUID tenantId) {
        return CampaignSegmentResponseDTO.builder()
                .id(segment.getId())
                .tenantId(segment.getTenantId())
                .name(segment.getName())
                .description(segment.getDescription())
                .segmentType(segment.getSegmentType())
                .targetAudience(segment.getTargetAudience())
                .primaryPersona(segment.getPrimaryPersona())
                .territoryFocus(segment.getTerritoryFocus())
                .minLeadScore(segment.getMinLeadScore())
                .minEstimatedValue(segment.getMinEstimatedValue())
                .maxEstimatedValue(segment.getMaxEstimatedValue())
                .titleKeyword(segment.getTitleKeyword())
                .companyKeyword(segment.getCompanyKeyword())
                .sourceFilters(segment.getSourceFilters())
                .statusFilters(segment.getStatusFilters())
                .includeCampaignAttributedOnly(segment.getIncludeCampaignAttributedOnly())
                .isActive(segment.getIsActive())
                .notes(segment.getNotes())
                .campaignsUsingSegment(campaignRepository.countByTenantIdAndSegmentIdAndArchivedFalse(tenantId, segment.getId()))
                .createdAt(segment.getCreatedAt())
                .updatedAt(segment.getUpdatedAt())
                .build();
    }

    private void validateRequest(CampaignSegmentRequestDTO request) {
        if (request.getIncludeCampaignAttributedOnly() == null || request.getIsActive() == null) {
            throw new BadRequestException("Segment active flags are required");
        }
        if (request.getMinEstimatedValue() != null && request.getMaxEstimatedValue() != null
                && request.getMaxEstimatedValue().compareTo(request.getMinEstimatedValue()) < 0) {
            throw new BadRequestException("Segment max estimated value cannot be below min estimated value");
        }
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private boolean hasValues(String[] values) {
        return values != null && Arrays.stream(values).anyMatch(this::hasText);
    }

    private boolean matchesArray(String actual, String[] expectedValues) {
        if (!hasText(actual)) {
            return false;
        }
        return Arrays.stream(expectedValues)
                .filter(this::hasText)
                .anyMatch(item -> item.trim().equalsIgnoreCase(actual.trim()));
    }

    private String[] normalizeArray(String[] values) {
        if (values == null) {
            return null;
        }
        List<String> normalized = Arrays.stream(values)
                .filter(this::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        return normalized.isEmpty() ? null : normalized.toArray(String[]::new);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean equalsIgnoreCaseTrim(String left, String right) {
        return hasText(left) && hasText(right) && left.trim().equalsIgnoreCase(right.trim());
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeNullable(String value) {
        return hasText(value) ? normalize(value) : null;
    }
}
