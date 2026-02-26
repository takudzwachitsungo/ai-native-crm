package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.DocumentFilterDTO;
import com.crm.dto.request.DocumentRequestDTO;
import com.crm.dto.response.DocumentResponseDTO;
import com.crm.entity.Document;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.DocumentMapper;
import com.crm.repository.DocumentRepository;
import com.crm.repository.UserRepository;
import com.crm.service.DocumentService;
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
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentMapper documentMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<DocumentResponseDTO> findAll(Pageable pageable, DocumentFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Document>> specs = new ArrayList<>();
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
            
            if (filter.getCategory() != null) {
                specs.add(SpecificationBuilder.equal("category", filter.getCategory()));
            }
            
            if (filter.getRelatedEntityType() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityType", filter.getRelatedEntityType()));
            }
            
            if (filter.getRelatedEntityId() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityId", filter.getRelatedEntityId()));
            }
            
            if (filter.getUploadedById() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("uploadedBy"), filter.getUploadedById()));
            }
        }
        
        Specification<Document> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Document> documents = documentRepository.findAll(spec, pageable);
        
        return documents.map(documentMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "documents", key = "#id")
    public DocumentResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Document document = documentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
        
        return documentMapper.toDto(document);
    }

    @Override
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public DocumentResponseDTO create(DocumentRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Document document = documentMapper.toEntity(request);
        document.setTenantId(tenantId);
        
        // Set uploaded by user if provided
        if (request.getUploadedById() != null) {
            User user = userRepository.findById(request.getUploadedById())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getUploadedById()));
            document.setUploadedBy(request.getUploadedById());
        }
        
        document = documentRepository.save(document);
        log.info("Created document: {} for tenant: {}", document.getId(), tenantId);
        
        return documentMapper.toDto(document);
    }

    @Override
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public DocumentResponseDTO update(UUID id, DocumentRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Document document = documentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
        
        // Update uploaded by user if changed
        if (request.getUploadedById() != null && !request.getUploadedById().equals(document.getUploadedBy())) {
            User user = userRepository.findById(request.getUploadedById())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getUploadedById()));
            document.setUploadedBy(request.getUploadedById());
        }
        
        documentMapper.updateEntity(request, document);
        document = documentRepository.save(document);
        
        log.info("Updated document: {} for tenant: {}", id, tenantId);
        
        return documentMapper.toDto(document);
    }

    @Override
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Document document = documentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
        
        document.setArchived(true);
        documentRepository.save(document);
        
        log.info("Deleted (archived) document: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Document> documents = documentRepository.findAllById(ids).stream()
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .collect(Collectors.toList());
        
        if (documents.isEmpty()) {
            throw new BadRequestException("No valid documents found for deletion");
        }
        
        documents.forEach(document -> document.setArchived(true));
        documentRepository.saveAll(documents);
        
        log.info("Bulk deleted {} documents for tenant: {}", documents.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponseDTO> findByRelatedEntity(String entityType, UUID entityId) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Document> documents = documentRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
                tenantId, entityType, entityId);
        return documents.stream()
                .map(documentMapper::toDto)
                .collect(Collectors.toList());
    }
}
