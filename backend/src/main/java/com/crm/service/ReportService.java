package com.crm.service;

import com.crm.dto.request.ReportGenerateRequestDTO;
import com.crm.dto.request.StandardReportDefinitionRequestDTO;
import com.crm.dto.response.GeneratedReportResponseDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;
import com.crm.dto.response.StandardReportDefinitionResponseDTO;

import java.util.List;
import java.util.UUID;

public interface ReportService {
    List<ReportTemplateResponseDTO> getTemplates();
    GeneratedReportResponseDTO generateReport(ReportGenerateRequestDTO request);
    byte[] exportReportPdf(ReportGenerateRequestDTO request);
    byte[] exportReportXlsx(ReportGenerateRequestDTO request);
    List<StandardReportDefinitionResponseDTO> listStandardDefinitions();
    StandardReportDefinitionResponseDTO saveStandardDefinition(StandardReportDefinitionRequestDTO request);
    void deleteStandardDefinition(UUID definitionId);
    GeneratedReportResponseDTO runStandardDefinition(UUID definitionId);
}
