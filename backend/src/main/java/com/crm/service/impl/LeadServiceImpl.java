package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.LeadFilterDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.LeadStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.LeadMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.LeadRepository;
import com.crm.service.LeadService;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final LeadMapper leadMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<LeadResponseDTO> findAll(Pageable pageable, LeadFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Lead>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("firstName")), search),
                    cb.like(cb.lower(root.get("lastName")), search),
                    cb.like(cb.lower(root.get("email")), search),
                    cb.like(cb.lower(root.get("company")), search)
                ));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getSource() != null) {
                specs.add(SpecificationBuilder.equal("source", filter.getSource()));
            }
            
            if (filter.getMinScore() != null) {
                specs.add(SpecificationBuilder.greaterThan("score", filter.getMinScore()));
            }
            
            if (filter.getMaxScore() != null) {
                specs.add(SpecificationBuilder.lessThan("score", filter.getMaxScore()));
            }
            
            if (filter.getMinEstimatedValue() != null) {
                specs.add(SpecificationBuilder.greaterThan("estimatedValue", filter.getMinEstimatedValue()));
            }
            
            if (filter.getMaxEstimatedValue() != null) {
                specs.add(SpecificationBuilder.lessThan("estimatedValue", filter.getMaxEstimatedValue()));
            }
            
            if (filter.getLastContactDateFrom() != null && filter.getLastContactDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("lastContactDate", 
                    filter.getLastContactDateFrom(), filter.getLastContactDateTo()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Lead> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Lead> leads = leadRepository.findAll(spec, pageable);
        
        return leads.map(leadMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "lead", key = "#id")
    public LeadResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public LeadResponseDTO create(LeadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadMapper.toEntity(request);
        lead.setTenantId(tenantId);
        
        // Set default status if not provided
        if (lead.getStatus() == null) {
            lead.setStatus(LeadStatus.NEW);
        }
        
        // Set default score if not provided
        if (lead.getScore() == null) {
            lead.setScore(50);
        }
        
        lead = leadRepository.save(lead);
        log.info("Created lead: {} for tenant: {}", lead.getId(), tenantId);
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "dashboard-metrics"}, key = "#id", allEntries = true)
    public LeadResponseDTO update(UUID id, LeadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        leadMapper.updateEntity(request, lead);
        lead = leadRepository.save(lead);
        
        log.info("Updated lead: {} for tenant: {}", id, tenantId);
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "dashboard-metrics"}, key = "#id", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        lead.setArchived(true);
        leadRepository.save(lead);
        
        log.info("Deleted (archived) lead: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findAllById(ids).stream()
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .collect(Collectors.toList());
        
        if (leads.isEmpty()) {
            throw new BadRequestException("No valid leads found for deletion");
        }
        
        leads.forEach(lead -> lead.setArchived(true));
        leadRepository.saveAll(leads);
        
        log.info("Bulk deleted {} leads for tenant: {}", leads.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "contacts", "dashboard-metrics"}, allEntries = true)
    public UUID convertToContact(UUID leadId, UUID companyId) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(leadId)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));
        
        if (lead.getStatus() == LeadStatus.CONVERTED) {
            throw new BadRequestException("Lead is already converted");
        }
        
        // Verify company exists if provided
        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId)
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        }
        
        // Create contact from lead
        Contact contact = new Contact();
        contact.setTenantId(tenantId);
        contact.setFirstName(lead.getFirstName());
        contact.setLastName(lead.getLastName());
        contact.setEmail(lead.getEmail());
        contact.setPhone(lead.getPhone());
        contact.setTitle(lead.getTitle());
        contact.setStatus(ContactStatus.ACTIVE);
        contact.setNotes(lead.getNotes());
        contact.setLastContactDate(lead.getLastContactDate());
        
        if (company != null) {
            contact.setCompany(company);
        }
        
        contact = contactRepository.save(contact);
        
        // Update lead status to converted
        lead.setStatus(LeadStatus.CONVERTED);
        leadRepository.save(lead);
        
        log.info("Converted lead {} to contact {} for tenant: {}", leadId, contact.getId(), tenantId);
        
        return contact.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadResponseDTO> findHighScoringLeads(Integer minScore) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findHighScoringLeads(tenantId, minScore);
        return leads.stream()
                .map(leadMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LeadStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        log.info("Getting lead statistics for tenant: {}", tenantId);
        
        List<Lead> allLeads = leadRepository.findByTenantIdAndArchivedFalse(tenantId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        log.info("Found {} leads for tenant {}", allLeads.size(), tenantId);
        
        Long totalLeads = (long) allLeads.size();
        
        Map<LeadStatus, Long> leadsByStatus = allLeads.stream()
                .collect(Collectors.groupingBy(Lead::getStatus, Collectors.counting()));
        
        Double totalEstimatedValue = allLeads.stream()
                .filter(l -> l.getEstimatedValue() != null)
                .mapToDouble(l -> l.getEstimatedValue().doubleValue())
                .sum();
        
        Double averageScore = allLeads.stream()
                .filter(l -> l.getScore() != null)
                .mapToInt(Lead::getScore)
                .average()
                .orElse(0.0);
        
        Long convertedLeads = leadsByStatus.getOrDefault(LeadStatus.CONVERTED, 0L);
        Double conversionRate = totalLeads > 0 ? (convertedLeads.doubleValue() / totalLeads) * 100 : 0.0;
        
        return LeadStatsDTO.builder()
                .totalLeads(totalLeads)
                .leadsByStatus(leadsByStatus)
                .totalEstimatedValue(java.math.BigDecimal.valueOf(totalEstimatedValue))
                .averageScore(averageScore)
                .leadsConvertedThisMonth(convertedLeads)
                .conversionRate(conversionRate)
                .build();
    }
}
