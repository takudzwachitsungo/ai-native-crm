package com.crm.service;

import com.crm.dto.request.DocumentFilterDTO;
import com.crm.dto.request.DocumentRequestDTO;
import com.crm.dto.request.DocumentUploadRequestDTO;
import com.crm.dto.response.DocumentDownloadDTO;
import com.crm.dto.response.DocumentResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface DocumentService {
    
    Page<DocumentResponseDTO> findAll(Pageable pageable, DocumentFilterDTO filter);
    
    DocumentResponseDTO findById(UUID id);
    
    DocumentResponseDTO create(DocumentRequestDTO request);

    DocumentResponseDTO upload(DocumentUploadRequestDTO request);
    
    DocumentResponseDTO update(UUID id, DocumentRequestDTO request);

    DocumentDownloadDTO download(UUID id);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<DocumentResponseDTO> findByRelatedEntity(String entityType, UUID entityId);
}
