package com.crm.service;

import com.crm.dto.request.WorkOrderCompletionRequestDTO;
import com.crm.dto.request.WorkOrderFilterDTO;
import com.crm.dto.request.WorkOrderRequestDTO;
import com.crm.dto.response.WorkOrderResponseDTO;
import com.crm.dto.response.WorkOrderStatsDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface WorkOrderService {

    Page<WorkOrderResponseDTO> findAll(Pageable pageable, WorkOrderFilterDTO filter);

    WorkOrderResponseDTO findById(UUID id);

    WorkOrderResponseDTO create(WorkOrderRequestDTO request);

    WorkOrderResponseDTO update(UUID id, WorkOrderRequestDTO request);

    void delete(UUID id);

    WorkOrderResponseDTO dispatch(UUID id);

    WorkOrderResponseDTO start(UUID id);

    WorkOrderResponseDTO complete(UUID id, WorkOrderCompletionRequestDTO request);

    WorkOrderStatsDTO getStatistics();
}
