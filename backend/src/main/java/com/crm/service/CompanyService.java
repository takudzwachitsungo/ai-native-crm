package com.crm.service;

import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.request.CompanyTerritoryReassignmentRequestDTO;
import com.crm.dto.response.CompanyInsightsResponseDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.dto.response.CompanyTerritoryQueueSummaryDTO;
import com.crm.dto.response.CompanyTerritoryReassignmentResultDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CompanyService {
    
    Page<CompanyResponseDTO> findAll(Pageable pageable, CompanyFilterDTO filter);
    
    CompanyResponseDTO findById(UUID id);

    CompanyInsightsResponseDTO getInsights(UUID id);

    CompanyTerritoryQueueSummaryDTO getTerritoryGovernanceQueue();

    CompanyTerritoryReassignmentResultDTO reassignTerritoryMismatches(CompanyTerritoryReassignmentRequestDTO request);
    
    CompanyResponseDTO create(CompanyRequestDTO request);
    
    CompanyResponseDTO update(UUID id, CompanyRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<CompanyResponseDTO> searchByName(String name);
}
