package com.crm.service;

import com.crm.dto.request.LeadFilterDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.dto.response.LeadStatsDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LeadService {
    
    /**
     * Find all leads with pagination and filtering
     */
    Page<LeadResponseDTO> findAll(Pageable pageable, LeadFilterDTO filter);
    
    /**
     * Find lead by ID
     */
    LeadResponseDTO findById(UUID id);
    
    /**
     * Create new lead
     */
    LeadResponseDTO create(LeadRequestDTO request);
    
    /**
     * Update existing lead
     */
    LeadResponseDTO update(UUID id, LeadRequestDTO request);
    
    /**
     * Delete lead (soft delete)
     */
    void delete(UUID id);
    
    /**
     * Bulk delete leads
     */
    void bulkDelete(List<UUID> ids);
    
    /**
     * Convert lead to contact
     */
    UUID convertToContact(UUID leadId, UUID companyId);
    
    /**
     * Find high-scoring leads
     */
    List<LeadResponseDTO> findHighScoringLeads(Integer minScore);
    
    /**
     * Get lead statistics
     */
    LeadStatsDTO getStatistics();
}
