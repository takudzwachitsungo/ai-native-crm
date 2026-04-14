package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.DocumentFilterDTO;
import com.crm.dto.request.DocumentRequestDTO;
import com.crm.dto.request.DocumentUploadRequestDTO;
import com.crm.dto.response.DocumentDownloadDTO;
import com.crm.dto.response.DocumentResponseDTO;
import com.crm.entity.Document;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.DocumentMapper;
import com.crm.repository.DocumentRepository;
import com.crm.repository.UserRepository;
import com.crm.service.DocumentService;
import com.crm.service.DocumentStorageService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final DocumentStorageService documentStorageService;

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
        document.setUploadedBy(resolveUploadedById(tenantId, request.getUploadedById()));

        document = saveDocument(document);
        log.info("Created document: {} for tenant: {}", document.getId(), tenantId);
        
        return documentMapper.toDto(document);
    }

    @Override
    @Transactional
    @CacheEvict(value = "documents", allEntries = true)
    public DocumentResponseDTO upload(DocumentUploadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        String storedPath = documentStorageService.store(tenantId, request.getFile());

        Document document = Document.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .category(request.getCategory())
                .filePath(storedPath)
                .fileType(resolveFileType(request))
                .fileSize(String.valueOf(request.getFile().getSize()))
                .relatedEntityType(normalizeBlank(request.getRelatedEntityType()))
                .relatedEntityId(request.getRelatedEntityId())
                .uploadedBy(resolveUploadedById(tenantId, request.getUploadedById()))
                .build();
        document.setTenantId(tenantId);

        document = saveDocument(document);
        log.info("Uploaded document: {} for tenant: {}", document.getId(), tenantId);

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
        
        if (request.getUploadedById() != null && !request.getUploadedById().equals(document.getUploadedBy())) {
            document.setUploadedBy(resolveUploadedById(tenantId, request.getUploadedById()));
        }
        
        documentMapper.updateEntity(request, document);
        document = saveDocument(document);
        
        log.info("Updated document: {} for tenant: {}", id, tenantId);
        
        return documentMapper.toDto(document);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDownloadDTO download(UUID id) {
        Document document = getActiveDocument(id);
        UUID tenantId = TenantContext.getTenantId();
        return documentStorageService.load(tenantId, document.getFilePath(), document.getName(), document.getFileType());
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

    private Document getActiveDocument(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        return documentRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
    }

    private UUID resolveUploadedById(UUID tenantId, UUID uploadedById) {
        UUID candidateId = uploadedById != null ? uploadedById : getCurrentUserId();
        if (candidateId == null) {
            return null;
        }

        userRepository.findById(candidateId)
                .filter(user -> user.getTenantId().equals(tenantId) && user.getIsActive())
                .orElseThrow(() -> new ResourceNotFoundException("User", candidateId));

        return candidateId;
    }

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return null;
        }
        return user.getId();
    }

    private String resolveFileType(DocumentUploadRequestDTO request) {
        String contentType = request.getFile().getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }

        String originalFilename = request.getFile().getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "application/octet-stream";
        }

        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private Document saveDocument(Document document) {
        Document savedDocument = documentRepository.save(document);
        String expectedFileUrl = shouldExposeManagedDownload(savedDocument.getFilePath())
                ? buildDownloadUrl(savedDocument.getId())
                : null;
        if ((expectedFileUrl == null && savedDocument.getFileUrl() != null)
                || (expectedFileUrl != null && !expectedFileUrl.equals(savedDocument.getFileUrl()))) {
            savedDocument.setFileUrl(expectedFileUrl);
            savedDocument = documentRepository.save(savedDocument);
        }
        return savedDocument;
    }

    private String buildDownloadUrl(UUID documentId) {
        return "/api/v1/documents/" + documentId + "/download";
    }

    private boolean shouldExposeManagedDownload(String filePath) {
        return filePath != null
                && !filePath.isBlank()
                && !filePath.startsWith("/")
                && !filePath.contains("://");
    }
}
