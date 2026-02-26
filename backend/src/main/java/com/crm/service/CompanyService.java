package com.crm.service;

import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.response.CompanyResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CompanyService {
    
    Page<CompanyResponseDTO> findAll(Pageable pageable, CompanyFilterDTO filter);
    
    CompanyResponseDTO findById(UUID id);
    
    CompanyResponseDTO create(CompanyRequestDTO request);
    
    CompanyResponseDTO update(UUID id, CompanyRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<CompanyResponseDTO> searchByName(String name);
}
