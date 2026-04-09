package com.crm.service;

import com.crm.dto.request.ReportGenerateRequestDTO;
import com.crm.dto.response.GeneratedReportResponseDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;

import java.util.List;

public interface ReportService {
    List<ReportTemplateResponseDTO> getTemplates();
    GeneratedReportResponseDTO generateReport(ReportGenerateRequestDTO request);
}
