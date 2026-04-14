package com.crm.service;

import com.crm.dto.request.SupportCaseFilterDTO;
import com.crm.dto.request.SupportCaseRequestDTO;
import com.crm.dto.response.SupportCaseResponseDTO;
import com.crm.dto.response.SupportCaseAssignmentAutomationResultDTO;
import com.crm.dto.response.SupportCaseAssignmentQueueSummaryDTO;
import com.crm.dto.response.SupportCaseOperationsDashboardDTO;
import com.crm.dto.response.SupportCaseSlaAutomationResultDTO;
import com.crm.dto.response.SupportCaseStatsDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SupportCaseService {

    Page<SupportCaseResponseDTO> findAll(Pageable pageable, SupportCaseFilterDTO filter);

    SupportCaseResponseDTO findById(UUID id);

    SupportCaseResponseDTO create(SupportCaseRequestDTO request);

    SupportCaseResponseDTO update(UUID id, SupportCaseRequestDTO request);

    void delete(UUID id);

    SupportCaseStatsDTO getStatistics();

    SupportCaseOperationsDashboardDTO getOperationsDashboard();

    SupportCaseAssignmentQueueSummaryDTO getAssignmentQueue();

    SupportCaseAssignmentAutomationResultDTO runAssignmentAutomation();

    SupportCaseSlaAutomationResultDTO runSlaBreachAutomation();
}
