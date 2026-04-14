package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.CampaignFilterDTO;
import com.crm.dto.request.CampaignRequestDTO;
import com.crm.dto.response.CampaignInsightsResponseDTO;
import com.crm.dto.response.CampaignResponseDTO;
import com.crm.dto.response.CampaignStatsDTO;
import com.crm.entity.Campaign;
import com.crm.entity.CampaignSegment;
import com.crm.entity.Lead;
import com.crm.entity.NurtureJourney;
import com.crm.entity.NurtureJourneyStep;
import com.crm.entity.User;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.LeadStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.CampaignMapper;
import com.crm.repository.CampaignRepository;
import com.crm.repository.CampaignSegmentRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.NurtureJourneyRepository;
import com.crm.repository.NurtureJourneyStepRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.CampaignService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignServiceImpl implements CampaignService {

    private static final EnumSet<LeadStatus> CLOSED_LEAD_STATUSES = EnumSet.of(
            LeadStatus.CONVERTED,
            LeadStatus.LOST,
            LeadStatus.UNQUALIFIED
    );

    private final CampaignRepository campaignRepository;
    private final LeadRepository leadRepository;
    private final CampaignMapper campaignMapper;
    private final UserRepository userRepository;
    private final RecordAccessService recordAccessService;
    private final CampaignSegmentRepository campaignSegmentRepository;
    private final NurtureJourneyRepository nurtureJourneyRepository;
    private final NurtureJourneyStepRepository nurtureJourneyStepRepository;
    private final CampaignSegmentServiceImpl campaignSegmentService;

    @Override
    @Transactional(readOnly = true)
    public Page<CampaignResponseDTO> findAll(Pageable pageable, CampaignFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();

        List<Specification<Campaign>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Campaign> accessScope = recordAccessService.campaignReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }

        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase().trim() + "%";
                specs.add((root, query, cb) -> cb.or(
                        cb.like(cb.lower(root.get("name")), search),
                        cb.like(cb.lower(root.get("targetAudience")), search),
                        cb.like(cb.lower(root.get("description")), search)
                ));
            }

            specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            specs.add(SpecificationBuilder.equal("type", filter.getType()));
            specs.add(SpecificationBuilder.equal("channel", filter.getChannel()));
            specs.add(SpecificationBuilder.dateBetween("startDate", filter.getStartDateFrom(), filter.getStartDateTo()));
        }

        Specification<Campaign> spec = SpecificationBuilder.combineWithAnd(specs);
        return campaignRepository.findAll(spec, pageable).map(campaign -> enrichCampaignResponse(tenantId, campaignMapper.toDto(campaign), campaign.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        Campaign campaign = campaignRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", id));
        recordAccessService.assertCanViewCampaign(campaign);
        return enrichCampaignResponse(tenantId, campaignMapper.toDto(campaign), campaign.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignInsightsResponseDTO getInsights(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        Campaign campaign = campaignRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", id));
        recordAccessService.assertCanViewCampaign(campaign);

        List<Lead> attributedLeads = leadRepository.findByTenantIdAndCampaignIdAndArchivedFalse(tenantId, id);
        long openAttributedLeadCount = attributedLeads.stream()
                .filter(lead -> lead.getStatus() != null && !CLOSED_LEAD_STATUSES.contains(lead.getStatus()))
                .count();
        int fastTrackedLeadCount = (int) attributedLeads.stream()
                .filter(lead -> lead.getScore() != null && lead.getScore() >= 80)
                .count();
        BigDecimal attributedPipelineValue = attributedLeads.stream()
                .map(Lead::getEstimatedValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        double averageLeadScore = attributedLeads.stream()
                .map(Lead::getScore)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);
        long convertedLeadCount = attributedLeads.stream()
                .filter(lead -> lead.getStatus() == LeadStatus.CONVERTED)
                .count();
        long qualifiedLeadCount = attributedLeads.stream()
                .filter(lead -> lead.getStatus() == LeadStatus.QUALIFIED || lead.getStatus() == LeadStatus.CONVERTED)
                .count();
        double attributedConversionRate = attributedLeads.isEmpty() ? 0.0 : (convertedLeadCount * 100.0d) / attributedLeads.size();
        double attributedOpportunityRate = attributedLeads.isEmpty() ? 0.0 : (qualifiedLeadCount * 100.0d) / attributedLeads.size();
        BigDecimal revenuePerAttributedLead = attributedLeads.isEmpty()
                ? BigDecimal.ZERO
                : safeMoney(campaign.getActualRevenue()).divide(BigDecimal.valueOf(attributedLeads.size()), 2, java.math.RoundingMode.HALF_UP);
        Long segmentMatchedLeadCount = campaign.getSegmentId() == null
                ? null
                : campaignSegmentService.preview(campaign.getSegmentId()).getMatchedLeadCount();
        List<NurtureJourneyStep> journeySteps = resolveJourneySteps(tenantId, campaign);
        NurtureJourneyStep firstJourneyStep = journeySteps.stream()
                .filter(step -> Boolean.TRUE.equals(step.getIsActive()))
                .findFirst()
                .orElse(null);

        Map<String, Long> leadsByStatus = attributedLeads.stream()
                .collect(Collectors.groupingBy(
                        lead -> lead.getStatus() != null ? lead.getStatus().name() : "UNKNOWN",
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        Map<String, Long> leadsBySource = attributedLeads.stream()
                .collect(Collectors.groupingBy(
                        lead -> lead.getSource() != null ? lead.getSource().name() : "UNKNOWN",
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        Map<String, Long> leadsByTerritory = attributedLeads.stream()
                .collect(Collectors.groupingBy(
                        lead -> lead.getTerritory() != null && !lead.getTerritory().isBlank() ? lead.getTerritory() : "Unassigned",
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        return CampaignInsightsResponseDTO.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .segmentId(campaign.getSegmentId())
                .segmentName(campaign.getSegmentName())
                .segmentType(campaign.getSegmentType() != null ? campaign.getSegmentType().name() : null)
                .journeyId(campaign.getJourneyId())
                .journeyName(campaign.getJourney() != null ? campaign.getJourney().getName() : null)
                .journeyStepCount((long) journeySteps.size())
                .firstJourneyStepName(firstJourneyStep != null ? firstJourneyStep.getName() : null)
                .journeyStage(campaign.getJourneyStage() != null ? campaign.getJourneyStage().name() : null)
                .autoEnrollNewLeads(campaign.getAutoEnrollNewLeads())
                .nurtureCadenceDays(campaign.getNurtureCadenceDays())
                .nurtureTouchCount(campaign.getNurtureTouchCount())
                .attributedLeadCount((long) attributedLeads.size())
                .openAttributedLeadCount(openAttributedLeadCount)
                .fastTrackedLeadCount(fastTrackedLeadCount)
                .attributedPipelineValue(attributedPipelineValue)
                .averageLeadScore(averageLeadScore)
                .attributedConversionRate(attributedConversionRate)
                .attributedOpportunityRate(attributedOpportunityRate)
                .revenuePerAttributedLead(revenuePerAttributedLead)
                .segmentMatchedLeadCount(segmentMatchedLeadCount)
                .leadsByStatus(leadsByStatus)
                .leadsBySource(leadsBySource)
                .leadsByTerritory(leadsByTerritory)
                .conversionFunnel(buildConversionFunnel(attributedLeads.size(), qualifiedLeadCount, convertedLeadCount))
                .recommendedActions(buildRecommendedActions(campaign, attributedLeads.size(), openAttributedLeadCount, averageLeadScore, leadsByTerritory, attributedConversionRate, segmentMatchedLeadCount))
                .build();
    }

    @Override
    @Transactional
    public CampaignResponseDTO create(CampaignRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        validateRequest(request, tenantId);

        Campaign campaign = campaignMapper.toEntity(request);
        campaign.setTenantId(tenantId);
        campaign.setArchived(false);
        campaign.setOwnerId(recordAccessService.resolveAssignableOwnerId(campaign.getOwnerId()));
        applyCampaignDefaults(tenantId, campaign);
        campaign = campaignRepository.save(campaign);

        log.info("Created campaign {} for tenant {}", campaign.getId(), tenantId);
        return enrichCampaignResponse(tenantId, campaignMapper.toDto(campaign), campaign.getId());
    }

    @Override
    @Transactional
    public CampaignResponseDTO update(UUID id, CampaignRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        validateRequest(request, tenantId);

        Campaign campaign = campaignRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", id));
        recordAccessService.assertCanWriteCampaign(campaign);

        campaignMapper.updateEntity(request, campaign);
        campaign.setOwnerId(recordAccessService.resolveAssignableOwnerId(campaign.getOwnerId()));
        applyCampaignDefaults(tenantId, campaign);
        campaign = campaignRepository.save(campaign);

        log.info("Updated campaign {} for tenant {}", id, tenantId);
        return enrichCampaignResponse(tenantId, campaignMapper.toDto(campaign), campaign.getId());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        Campaign campaign = campaignRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", id));
        recordAccessService.assertCanWriteCampaign(campaign);

        campaign.setArchived(true);
        campaignRepository.save(campaign);
        log.info("Archived campaign {} for tenant {}", id, tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public CampaignStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        List<Campaign> campaigns = campaignRepository.findByTenantIdAndArchivedFalse(tenantId);
        campaigns = campaigns.stream()
                .filter(recordAccessService::canViewCampaign)
                .toList();

        Map<CampaignStatus, Long> campaignsByStatus = new EnumMap<>(CampaignStatus.class);
        for (CampaignStatus status : CampaignStatus.values()) {
            campaignsByStatus.put(status, 0L);
        }
        campaigns.forEach(campaign -> campaignsByStatus.computeIfPresent(campaign.getStatus(), (key, count) -> count + 1));

        return CampaignStatsDTO.builder()
                .totalCampaigns((long) campaigns.size())
                .activeCampaigns(campaignsByStatus.getOrDefault(CampaignStatus.ACTIVE, 0L))
                .campaignsByStatus(campaignsByStatus)
                .totalBudget(sumMoney(campaigns, Campaign::getBudget))
                .totalExpectedRevenue(sumMoney(campaigns, Campaign::getExpectedRevenue))
                .totalActualRevenue(sumMoney(campaigns, Campaign::getActualRevenue))
                .totalLeadsGenerated(sumInteger(campaigns, Campaign::getLeadsGenerated))
                .totalOpportunitiesCreated(sumInteger(campaigns, Campaign::getOpportunitiesCreated))
                .totalConversions(sumInteger(campaigns, Campaign::getConversions))
                .totalAttributedLeads(leadRepository.countByTenantIdAndCampaignIdIsNotNullAndArchivedFalse(tenantId))
                .totalAttributedPipelineValue(leadRepository.sumEstimatedValueByTenantIdForAttributedCampaigns(tenantId))
                .totalSegments((long) campaignSegmentRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId).size())
                .totalJourneys((long) nurtureJourneyRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId).size())
                .campaignsUsingSegments((long) campaigns.stream().filter(campaign -> campaign.getSegmentId() != null).count())
                .campaignsUsingJourneys((long) campaigns.stream().filter(campaign -> campaign.getJourneyId() != null).count())
                .averageRoiPercent(averageMoney(campaigns.stream().map(Campaign::getRoiPercent).toList()))
                .averageAttributedConversionRate(campaigns.isEmpty() ? 0.0 : campaigns.stream()
                        .mapToDouble(this::campaignConversionRate)
                        .average()
                        .orElse(0.0))
                .build();
    }

    private CampaignResponseDTO enrichCampaignResponse(UUID tenantId, CampaignResponseDTO dto, UUID campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId).orElse(null);
        dto.setAttributedLeadCount(leadRepository.countByTenantIdAndCampaignIdAndArchivedFalse(tenantId, campaignId));
        dto.setAttributedPipelineValue(leadRepository.sumEstimatedValueByTenantIdAndCampaignId(tenantId, campaignId));
        if (campaign != null) {
            dto.setLinkedSegmentName(campaign.getSegment() != null ? campaign.getSegment().getName() : null);
            dto.setJourneyName(campaign.getJourney() != null ? campaign.getJourney().getName() : null);
            List<NurtureJourneyStep> journeySteps = resolveJourneySteps(tenantId, campaign);
            dto.setJourneyStepCount((long) journeySteps.size());
            dto.setFirstJourneyStepName(journeySteps.stream()
                    .filter(step -> Boolean.TRUE.equals(step.getIsActive()))
                    .map(NurtureJourneyStep::getName)
                    .findFirst()
                    .orElse(null));
        }
        return dto;
    }

    private List<NurtureJourneyStep> resolveJourneySteps(UUID tenantId, Campaign campaign) {
        if (campaign == null || campaign.getJourneyId() == null) {
            return List.of();
        }
        return nurtureJourneyStepRepository.findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(campaign.getJourneyId(), tenantId);
    }

    private void validateRequest(CampaignRequestDTO request, UUID tenantId) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Campaign end date cannot be before start date");
        }

        if (request.getJourneyId() == null && request.getNurtureTouchCount() != null && request.getNurtureCadenceDays() == null) {
            throw new BadRequestException("Nurture cadence is required when touch count is set");
        }

        if (request.getJourneyId() == null && Boolean.TRUE.equals(request.getAutoEnrollNewLeads()) && request.getNurtureTouchCount() == null) {
            throw new BadRequestException("Auto-enrollment requires a nurture touch count");
        }

        if (request.getSegmentId() != null) {
            CampaignSegment segment = findSegment(request.getSegmentId(), tenantId);
            if (!Boolean.TRUE.equals(segment.getIsActive())) {
                throw new BadRequestException("Selected campaign segment is inactive");
            }
        }

        if (request.getJourneyId() != null) {
            NurtureJourney journey = findJourney(request.getJourneyId(), tenantId);
            if (!Boolean.TRUE.equals(journey.getIsActive())) {
                throw new BadRequestException("Selected nurture journey is inactive");
            }
        }

        if (request.getOwnerId() != null) {
            User owner = userRepository.findByIdAndTenantIdAndArchivedFalse(request.getOwnerId(), tenantId)
                    .orElseThrow(() -> new BadRequestException("Selected campaign owner does not belong to this workspace"));
            if (!Boolean.TRUE.equals(owner.getIsActive())) {
                throw new BadRequestException("Selected campaign owner is inactive");
            }
        }
    }

    private void applyCampaignDefaults(UUID tenantId, Campaign campaign) {
        CampaignSegment segment = campaign.getSegmentId() != null ? findSegment(campaign.getSegmentId(), tenantId) : null;
        if (segment != null) {
            campaign.setSegment(segment);
            campaign.setSegmentType(segment.getSegmentType());
            campaign.setSegmentName(segment.getName());
            campaign.setPrimaryPersona(segment.getPrimaryPersona());
            campaign.setTerritoryFocus(segment.getTerritoryFocus());
            if (segment.getTargetAudience() != null) {
                campaign.setTargetAudience(segment.getTargetAudience());
            }
            if (campaign.getAudienceSize() == null) {
                campaign.setAudienceSize(Math.toIntExact(campaignSegmentService.preview(segment.getId()).getMatchedLeadCount()));
            }
        }

        NurtureJourney journey = campaign.getJourneyId() != null ? findJourney(campaign.getJourneyId(), tenantId) : null;
        if (journey != null) {
            campaign.setJourney(journey);
            campaign.setJourneyStage(journey.getJourneyStage());
            campaign.setAutoEnrollNewLeads(journey.getAutoEnrollNewLeads());
            campaign.setNurtureCadenceDays(journey.getDefaultCadenceDays());
            campaign.setNurtureTouchCount(journey.getDefaultTouchCount());
            if (journey.getDefaultCallToAction() != null) {
                campaign.setPrimaryCallToAction(journey.getDefaultCallToAction());
            }
        }

        if (campaign.getAutoEnrollNewLeads() == null) {
            campaign.setAutoEnrollNewLeads(Boolean.TRUE);
        }
        if (Boolean.TRUE.equals(campaign.getAutoEnrollNewLeads())) {
            if (campaign.getNurtureCadenceDays() == null) {
                campaign.setNurtureCadenceDays(3);
            }
            if (campaign.getNurtureTouchCount() == null) {
                campaign.setNurtureTouchCount(4);
            }
        } else {
            campaign.setNurtureCadenceDays(campaign.getNurtureCadenceDays());
            campaign.setNurtureTouchCount(campaign.getNurtureTouchCount());
        }
    }

    private CampaignSegment findSegment(UUID id, UUID tenantId) {
        return campaignSegmentRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign segment", id));
    }

    private NurtureJourney findJourney(UUID id, UUID tenantId) {
        return nurtureJourneyRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Nurture journey", id));
    }

    private BigDecimal sumMoney(List<Campaign> campaigns, java.util.function.Function<Campaign, BigDecimal> getter) {
        return campaigns.stream()
                .map(getter)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal averageMoney(List<BigDecimal> values) {
        List<BigDecimal> filtered = values.stream().filter(Objects::nonNull).toList();
        if (filtered.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return filtered.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(filtered.size()), 2, java.math.RoundingMode.HALF_UP);
    }

    private Long sumInteger(List<Campaign> campaigns, java.util.function.Function<Campaign, Integer> getter) {
        return campaigns.stream()
                .map(getter)
                .filter(java.util.Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum();
    }

    private List<String> buildRecommendedActions(
            Campaign campaign,
            int attributedLeadCount,
            long openAttributedLeadCount,
            double averageLeadScore,
            Map<String, Long> leadsByTerritory,
            double attributedConversionRate,
            Long segmentMatchedLeadCount
    ) {
        List<String> actions = new ArrayList<>();

        if (attributedLeadCount == 0) {
            actions.add("No leads are attributed yet. Check source tagging, campaign links, and enrollment paths.");
        }
        if (segmentMatchedLeadCount != null && segmentMatchedLeadCount > attributedLeadCount) {
            actions.add("Your reusable segment is larger than the currently attributed lead pool. Increase enrollment coverage or review source orchestration.");
        }
        if (Boolean.TRUE.equals(campaign.getAutoEnrollNewLeads()) && campaign.getNurtureTouchCount() != null && campaign.getNurtureTouchCount() >= 4) {
            actions.add("This campaign is configured for a multi-touch nurture. Keep email and task templates aligned with the same call to action.");
        }
        if (averageLeadScore > 0 && averageLeadScore < 55) {
            actions.add("Average attributed lead quality is low. Tighten the segment or persona before increasing spend.");
        }
        if (attributedLeadCount > 0 && attributedConversionRate < 10.0d) {
            actions.add("Attributed conversion is lagging. Adjust journey timing or tighten the segment before scaling the campaign.");
        }
        if (openAttributedLeadCount > 0 && leadsByTerritory.size() > 1) {
            actions.add("Attributed leads span multiple territories. Review territory-specific follow-up content and ownership coverage.");
        }
        if (campaign.getPrimaryCallToAction() == null || campaign.getPrimaryCallToAction().isBlank()) {
            actions.add("Add a primary call to action so the nurture journey has a consistent conversion target.");
        }
        if (actions.isEmpty()) {
            actions.add("Campaign attribution, segment definition, and nurture settings are aligned with current lead activity.");
        }

        return actions;
    }

    private Map<String, Long> buildConversionFunnel(int attributedLeadCount, long qualifiedLeadCount, long convertedLeadCount) {
        Map<String, Long> funnel = new LinkedHashMap<>();
        funnel.put("Attributed Leads", (long) attributedLeadCount);
        funnel.put("Qualified Leads", qualifiedLeadCount);
        funnel.put("Converted Leads", convertedLeadCount);
        funnel.put("Non-Converted Leads", Math.max(attributedLeadCount - convertedLeadCount, 0));
        return funnel;
    }

    private double campaignConversionRate(Campaign campaign) {
        long attributedLeadCount = leadRepository.countByTenantIdAndCampaignIdAndArchivedFalse(campaign.getTenantId(), campaign.getId());
        if (attributedLeadCount == 0) {
            return 0.0d;
        }
        long convertedLeadCount = leadRepository.findByTenantIdAndCampaignIdAndArchivedFalse(campaign.getTenantId(), campaign.getId()).stream()
                .filter(lead -> lead.getStatus() == LeadStatus.CONVERTED)
                .count();
        return (convertedLeadCount * 100.0d) / attributedLeadCount;
    }

    private BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
