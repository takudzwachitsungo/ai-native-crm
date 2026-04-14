package com.crm.service;

import com.crm.dto.request.CampaignFilterDTO;
import com.crm.dto.request.CampaignRequestDTO;
import com.crm.dto.response.CampaignInsightsResponseDTO;
import com.crm.dto.response.CampaignResponseDTO;
import com.crm.dto.response.CampaignStatsDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CampaignService {

    Page<CampaignResponseDTO> findAll(Pageable pageable, CampaignFilterDTO filter);

    CampaignResponseDTO findById(UUID id);

    CampaignInsightsResponseDTO getInsights(UUID id);

    CampaignResponseDTO create(CampaignRequestDTO request);

    CampaignResponseDTO update(UUID id, CampaignRequestDTO request);

    void delete(UUID id);

    CampaignStatsDTO getStatistics();
}
