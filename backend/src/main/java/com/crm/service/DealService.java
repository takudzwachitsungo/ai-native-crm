package com.crm.service;

import com.crm.dto.request.DealFilterDTO;
import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.request.DealApprovalActionRequestDTO;
import com.crm.dto.request.DealTerritoryReassignmentRequestDTO;
import com.crm.dto.response.DealAttentionSummaryDTO;
import com.crm.dto.response.DealAutomationResultDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.dto.response.DealTerritoryQueueSummaryDTO;
import com.crm.dto.response.DealTerritoryReassignmentResultDTO;
import com.crm.entity.enums.DealStage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface DealService {
    
    /**
     * Find all deals with pagination and filtering
     */
    Page<DealResponseDTO> findAll(Pageable pageable, DealFilterDTO filter);
    
    /**
     * Find deal by ID
     */
    DealResponseDTO findById(UUID id);
    
    /**
     * Create new deal
     */
    DealResponseDTO create(DealRequestDTO request);
    
    /**
     * Update existing deal
     */
    DealResponseDTO update(UUID id, DealRequestDTO request);
    
    /**
     * Delete deal (soft delete)
     */
    void delete(UUID id);
    
    /**
     * Bulk delete deals
     */
    void bulkDelete(List<UUID> ids);
    
    /**
     * Update deal stage
     */
    DealResponseDTO updateStage(UUID id, DealStage newStage);
    
    /**
     * Get deals by stage
     */
    List<DealResponseDTO> findByStage(DealStage stage);
    
    /**
     * Get deal statistics
     */
    DealStatsDTO getStatistics();

    DealAttentionSummaryDTO getAttentionSummary();

    DealAutomationResultDTO runStalledDealAutomation();

    DealResponseDTO requestApproval(UUID id, DealApprovalActionRequestDTO request);

    DealResponseDTO approve(UUID id, DealApprovalActionRequestDTO request);

    DealResponseDTO reject(UUID id, DealApprovalActionRequestDTO request);

    DealTerritoryQueueSummaryDTO getTerritoryGovernanceQueue();

    DealTerritoryReassignmentResultDTO reassignTerritoryMismatches(DealTerritoryReassignmentRequestDTO request);
}
