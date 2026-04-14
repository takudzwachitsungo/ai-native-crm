package com.crm.service;

import com.crm.dto.request.NurtureJourneyRequestDTO;
import com.crm.dto.response.NurtureJourneyResponseDTO;

import java.util.List;
import java.util.UUID;

public interface NurtureJourneyService {

    List<NurtureJourneyResponseDTO> findAll();

    NurtureJourneyResponseDTO findById(UUID id);

    NurtureJourneyResponseDTO create(NurtureJourneyRequestDTO request);

    NurtureJourneyResponseDTO update(UUID id, NurtureJourneyRequestDTO request);

    void delete(UUID id);
}
