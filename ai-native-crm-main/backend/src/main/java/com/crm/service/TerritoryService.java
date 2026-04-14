package com.crm.service;

import com.crm.dto.request.TerritoryRequestDTO;
import com.crm.dto.response.TerritoryResponseDTO;

import java.util.List;
import java.util.UUID;

public interface TerritoryService {

    List<TerritoryResponseDTO> findAll();

    TerritoryResponseDTO create(TerritoryRequestDTO request);

    TerritoryResponseDTO update(UUID id, TerritoryRequestDTO request);

    void delete(UUID id);
}
