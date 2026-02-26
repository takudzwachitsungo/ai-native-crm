package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.DealFilterDTO;
import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.enums.DealStage;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.DealMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.service.DealService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DealServiceImpl implements DealService {

    private final DealRepository dealRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final DealMapper dealMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<DealResponseDTO> findAll(Pageable pageable, DealFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Deal>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("description")), search)
                ));
            }
            
            if (filter.getStage() != null) {
                specs.add(SpecificationBuilder.equal("stage", filter.getStage()));
            }
            
            if (filter.getDealType() != null) {
                specs.add(SpecificationBuilder.equal("dealType", filter.getDealType()));
            }
            
            if (filter.getLeadSource() != null) {
                specs.add(SpecificationBuilder.equal("leadSource", filter.getLeadSource()));
            }
            
            if (filter.getMinValue() != null) {
                specs.add(SpecificationBuilder.greaterThan("value", filter.getMinValue()));
            }
            
            if (filter.getMaxValue() != null) {
                specs.add(SpecificationBuilder.lessThan("value", filter.getMaxValue()));
            }
            
            if (filter.getMinProbability() != null) {
                specs.add(SpecificationBuilder.greaterThan("probability", filter.getMinProbability()));
            }
            
            if (filter.getMaxProbability() != null) {
                specs.add(SpecificationBuilder.lessThan("probability", filter.getMaxProbability()));
            }
            
            if (filter.getExpectedCloseDateFrom() != null && filter.getExpectedCloseDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("expectedCloseDate",
                    filter.getExpectedCloseDateFrom(), filter.getExpectedCloseDateTo()));
            }
            
            if (filter.getCompanyId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("company").get("id"), filter.getCompanyId()));
            }
            
            if (filter.getContactId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("contact").get("id"), filter.getContactId()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Deal> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Deal> deals = dealRepository.findAll(spec, pageable);
        
        return deals.map(dealMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "deal", key = "#id")
    public DealResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        
        return dealMapper.toDto(deal);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public DealResponseDTO create(DealRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealMapper.toEntity(request);
        deal.setTenantId(tenantId);
        
        // Set company if provided
        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
            deal.setCompany(company);
        }
        
        // Set contact if provided
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            deal.setContact(contact);
        }
        
        // Set default probability based on stage if not provided
        if (deal.getProbability() == null) {
            deal.setProbability(getDefaultProbabilityForStage(deal.getStage()));
        }
        
        deal = dealRepository.save(deal);
        log.info("Created deal: {} for tenant: {}", deal.getId(), tenantId);
        
        return dealMapper.toDto(deal);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public DealResponseDTO update(UUID id, DealRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        
        // Update company if changed
        if (request.getCompanyId() != null && !request.getCompanyId().equals(
                deal.getCompany() != null ? deal.getCompany().getId() : null)) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
            deal.setCompany(company);
        }
        
        // Update contact if changed
        if (request.getContactId() != null && !request.getContactId().equals(
                deal.getContact() != null ? deal.getContact().getId() : null)) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            deal.setContact(contact);
        }
        
        dealMapper.updateEntity(request, deal);
        deal = dealRepository.save(deal);
        
        log.info("Updated deal: {} for tenant: {}", id, tenantId);
        
        return dealMapper.toDto(deal);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        
        deal.setArchived(true);
        dealRepository.save(deal);
        
        log.info("Deleted (archived) deal: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Deal> deals = dealRepository.findAllById(ids).stream()
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .collect(Collectors.toList());
        
        if (deals.isEmpty()) {
            throw new BadRequestException("No valid deals found for deletion");
        }
        
        deals.forEach(deal -> deal.setArchived(true));
        dealRepository.saveAll(deals);
        
        log.info("Bulk deleted {} deals for tenant: {}", deals.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public DealResponseDTO updateStage(UUID id, DealStage newStage) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        
        DealStage oldStage = deal.getStage();
        deal.setStage(newStage);
        
        // Update probability based on new stage
        deal.setProbability(getDefaultProbabilityForStage(newStage));
        
        // Set actual close date if won or lost
        if (newStage == DealStage.CLOSED_WON || newStage == DealStage.CLOSED_LOST) {
            deal.setActualCloseDate(LocalDate.now());
        }
        
        deal = dealRepository.save(deal);
        
        log.info("Updated deal {} stage from {} to {} for tenant: {}", id, oldStage, newStage, tenantId);
        
        return dealMapper.toDto(deal);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DealResponseDTO> findByStage(DealStage stage) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Deal> deals = dealRepository.findByTenantIdAndStageAndArchivedFalse(tenantId, stage);
        return deals.stream()
                .map(dealMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DealStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Deal> allDeals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        
        Long totalDeals = (long) allDeals.size();
        
        Map<DealStage, Long> dealsByStage = allDeals.stream()
                .collect(Collectors.groupingBy(Deal::getStage, Collectors.counting()));
        
        Map<DealStage, BigDecimal> valueByStage = allDeals.stream()
                .collect(Collectors.groupingBy(
                    Deal::getStage,
                    Collectors.reducing(BigDecimal.ZERO, Deal::getValue, BigDecimal::add)
                ));
        
        BigDecimal totalValue = allDeals.stream()
                .map(Deal::getValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal weightedTotalValue = allDeals.stream()
                .map(Deal::getWeightedValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal averageDealValue = totalDeals > 0 
                ? totalValue.divide(BigDecimal.valueOf(totalDeals), 2, BigDecimal.ROUND_HALF_UP)
                : BigDecimal.ZERO;
        
        Long wonDeals = dealsByStage.getOrDefault(DealStage.CLOSED_WON, 0L);
        Long lostDeals = dealsByStage.getOrDefault(DealStage.CLOSED_LOST, 0L);
        Long closedDeals = wonDeals + lostDeals;
        
        Double winRate = closedDeals > 0 ? (wonDeals.doubleValue() / closedDeals) * 100 : 0.0;
        
        BigDecimal wonValue = valueByStage.getOrDefault(DealStage.CLOSED_WON, BigDecimal.ZERO);
        
        return DealStatsDTO.builder()
                .totalDeals(totalDeals)
                .dealsByStage(dealsByStage)
                .valueByStage(valueByStage)
                .totalValue(totalValue)
                .weightedTotalValue(weightedTotalValue)
                .averageDealValue(averageDealValue)
                .wonDealsThisMonth(wonDeals)
                .wonValueThisMonth(wonValue)
                .winRate(winRate)
                .build();
    }

    private Integer getDefaultProbabilityForStage(DealStage stage) {
        return switch (stage) {
            case PROSPECTING -> 5;
            case QUALIFICATION -> 10;
            case PROPOSAL -> 50;
            case NEGOTIATION -> 75;
            case CLOSED_WON -> 100;
            case CLOSED_LOST -> 0;
        };
    }
}
