package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.entity.Company;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.CompanyMapper;
import com.crm.repository.CompanyRepository;
import com.crm.service.CompanyService;
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
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyResponseDTO> findAll(Pageable pageable, CompanyFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Company>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("email")), search),
                    cb.like(cb.lower(root.get("website")), search)
                ));
            }
            
            if (filter.getIndustry() != null) {
                specs.add(SpecificationBuilder.equal("industry", filter.getIndustry()));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getMinRevenue() != null) {
                specs.add(SpecificationBuilder.greaterThan("revenue", filter.getMinRevenue()));
            }
            
            if (filter.getMaxRevenue() != null) {
                specs.add(SpecificationBuilder.lessThan("revenue", filter.getMaxRevenue()));
            }
            
            if (filter.getMinEmployeeCount() != null) {
                specs.add(SpecificationBuilder.greaterThan("employeeCount", filter.getMinEmployeeCount()));
            }
            
            if (filter.getMaxEmployeeCount() != null) {
                specs.add(SpecificationBuilder.lessThan("employeeCount", filter.getMaxEmployeeCount()));
            }
            
            if (filter.getCity() != null) {
                specs.add(SpecificationBuilder.equal("city", filter.getCity()));
            }
            
            if (filter.getState() != null) {
                specs.add(SpecificationBuilder.equal("state", filter.getState()));
            }
            
            if (filter.getCountry() != null) {
                specs.add(SpecificationBuilder.equal("country", filter.getCountry()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Company> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Company> companies = companyRepository.findAll(spec, pageable);
        
        return companies.map(companyMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "companies", key = "#id")
    public CompanyResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        
        return companyMapper.toDto(company);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public CompanyResponseDTO create(CompanyRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyMapper.toEntity(request);
        company.setTenantId(tenantId);
        
        company = companyRepository.save(company);
        log.info("Created company: {} for tenant: {}", company.getId(), tenantId);
        
        return companyMapper.toDto(company);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public CompanyResponseDTO update(UUID id, CompanyRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        
        companyMapper.updateEntity(request, company);
        company = companyRepository.save(company);
        
        log.info("Updated company: {} for tenant: {}", id, tenantId);
        
        return companyMapper.toDto(company);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        
        company.setArchived(true);
        companyRepository.save(company);
        
        log.info("Deleted (archived) company: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Company> companies = companyRepository.findAllById(ids).stream()
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .collect(Collectors.toList());
        
        if (companies.isEmpty()) {
            throw new BadRequestException("No valid companies found for deletion");
        }
        
        companies.forEach(company -> company.setArchived(true));
        companyRepository.saveAll(companies);
        
        log.info("Bulk deleted {} companies for tenant: {}", companies.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponseDTO> searchByName(String name) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Company> companies = companyRepository.searchByName(tenantId, "%" + name.toLowerCase() + "%");
        return companies.stream()
                .map(companyMapper::toDto)
                .collect(Collectors.toList());
    }
}
