package com.crm.service;

import com.crm.dto.request.CampaignSegmentRequestDTO;
import com.crm.dto.response.CampaignSegmentPreviewDTO;
import com.crm.dto.response.CampaignSegmentResponseDTO;

import java.util.List;
import java.util.UUID;

public interface CampaignSegmentService {

    List<CampaignSegmentResponseDTO> findAll();

    CampaignSegmentResponseDTO findById(UUID id);

    CampaignSegmentResponseDTO create(CampaignSegmentRequestDTO request);

    CampaignSegmentResponseDTO update(UUID id, CampaignSegmentRequestDTO request);

    void delete(UUID id);

    CampaignSegmentPreviewDTO preview(UUID id);
}
