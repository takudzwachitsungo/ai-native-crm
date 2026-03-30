package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.ContactFilterDTO;
import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.response.ContactResponseDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.ContactMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.service.ContactService;
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
public class ContactServiceImpl implements ContactService {

    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final ContactMapper contactMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<ContactResponseDTO> findAll(Pageable pageable, ContactFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Contact>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("firstName")), search),
                    cb.like(cb.lower(root.get("lastName")), search),
                    cb.like(cb.lower(root.get("email")), search)
                ));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getCompanyId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("company").get("id"), filter.getCompanyId()));
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
            
            if (filter.getLastContactDateFrom() != null && filter.getLastContactDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("lastContactDate",
                    filter.getLastContactDateFrom(), filter.getLastContactDateTo()));
            }
        }
        
        Specification<Contact> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Contact> contacts = contactRepository.findAll(spec, pageable);
        
        return contacts.map(contactMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "contacts", key = "#id")
    public ContactResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Contact contact = contactRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Contact", id));
        
        return contactMapper.toDto(contact);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"contacts", "dashboard-metrics"}, allEntries = true)
    public ContactResponseDTO create(ContactRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Contact contact = contactMapper.toEntity(request);
        contact.setTenantId(tenantId);

        applyRelationships(tenantId, contact, request, null);
        
        contact = contactRepository.save(contact);
        log.info("Created contact: {} for tenant: {}", contact.getId(), tenantId);
        
        return contactMapper.toDto(contact);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"contacts", "dashboard-metrics"}, allEntries = true)
    public ContactResponseDTO update(UUID id, ContactRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Contact contact = contactRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Contact", id));

        contactMapper.updateEntity(request, contact);
        applyRelationships(tenantId, contact, request, id);
        contact = contactRepository.save(contact);
        
        log.info("Updated contact: {} for tenant: {}", id, tenantId);
        
        return contactMapper.toDto(contact);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"contacts", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Contact contact = contactRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Contact", id));
        
        contact.setArchived(true);
        contactRepository.save(contact);
        
        log.info("Deleted (archived) contact: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"contacts", "dashboard-metrics"}, allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Contact> contacts = contactRepository.findAllById(ids).stream()
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .collect(Collectors.toList());
        
        if (contacts.isEmpty()) {
            throw new BadRequestException("No valid contacts found for deletion");
        }
        
        contacts.forEach(contact -> contact.setArchived(true));
        contactRepository.saveAll(contacts);
        
        log.info("Bulk deleted {} contacts for tenant: {}", contacts.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactResponseDTO> findByCompany(UUID companyId) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Contact> contacts = contactRepository.findByTenantIdAndCompanyIdAndArchivedFalse(tenantId, companyId);
        return contacts.stream()
                .map(contactMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactResponseDTO> searchContacts(String search) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Contact> contacts = contactRepository.searchContacts(tenantId, "%" + search.toLowerCase() + "%");
        return contacts.stream()
                .map(contactMapper::toDto)
                .collect(Collectors.toList());
    }

    private void applyRelationships(UUID tenantId, Contact contact, ContactRequestDTO request, UUID contactId) {
        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
            contact.setCompanyId(company.getId());
            contact.setCompany(company);
        } else {
            contact.setCompanyId(null);
            contact.setCompany(null);
        }

        if (request.getReportsToId() != null) {
            if (contactId != null && contactId.equals(request.getReportsToId())) {
                throw new BadRequestException("A contact cannot report to itself");
            }

            Contact reportsTo = contactRepository.findById(request.getReportsToId())
                    .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getReportsToId()));

            if (request.getCompanyId() != null && reportsTo.getCompanyId() != null
                    && !request.getCompanyId().equals(reportsTo.getCompanyId())) {
                throw new BadRequestException("Reporting contact must belong to the same company");
            }

            contact.setReportsToId(reportsTo.getId());
            contact.setReportsTo(reportsTo);
        } else {
            contact.setReportsToId(null);
            contact.setReportsTo(null);
        }

        if (contact.getIsPrimary() == null) {
            contact.setIsPrimary(Boolean.FALSE);
        }
    }
}
