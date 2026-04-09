package com.crm.service;

import com.crm.dto.request.NurtureJourneyStepRequestDTO;
import com.crm.dto.response.NurtureJourneyStepResponseDTO;

import java.util.List;
import java.util.UUID;

public interface NurtureJourneyStepService {

    List<NurtureJourneyStepResponseDTO> findAll(UUID journeyId);

    NurtureJourneyStepResponseDTO create(UUID journeyId, NurtureJourneyStepRequestDTO request);

    NurtureJourneyStepResponseDTO update(UUID journeyId, UUID stepId, NurtureJourneyStepRequestDTO request);

    void delete(UUID journeyId, UUID stepId);
}
