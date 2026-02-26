package com.crm.service;

import com.crm.dto.request.QuoteFilterDTO;
import com.crm.dto.request.QuoteRequestDTO;
import com.crm.dto.response.QuoteResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface QuoteService {
    
    Page<QuoteResponseDTO> findAll(Pageable pageable, QuoteFilterDTO filter);
    
    QuoteResponseDTO findById(UUID id);
    
    QuoteResponseDTO create(QuoteRequestDTO request);
    
    QuoteResponseDTO update(UUID id, QuoteRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    QuoteResponseDTO updateStatus(UUID id, String status);
}
