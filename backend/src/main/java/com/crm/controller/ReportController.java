package com.crm.controller;

import com.crm.dto.request.ReportGenerateRequestDTO;
import com.crm.dto.request.StandardReportDefinitionRequestDTO;
import com.crm.dto.response.GeneratedReportResponseDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;
import com.crm.dto.response.StandardReportDefinitionResponseDTO;
import com.crm.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Reports", description = "Standard CRM reporting endpoints")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/templates")
    @Operation(summary = "List report templates", description = "List standard CRM report templates available in the backend")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getTemplates() {
        List<ReportTemplateResponseDTO> templates = reportService.getTemplates();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "templates", templates
        ));
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate standard report", description = "Generate a deterministic CRM report from backend data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GeneratedReportResponseDTO> generate(@Valid @RequestBody ReportGenerateRequestDTO request) {
        return ResponseEntity.ok(reportService.generateReport(request));
    }

    @GetMapping("/definitions")
    @Operation(summary = "List saved standard report definitions", description = "Returns tenant-scoped saved definitions for standard backend reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> listDefinitions() {
        List<StandardReportDefinitionResponseDTO> definitions = reportService.listStandardDefinitions();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "definitions", definitions
        ));
    }

    @PostMapping("/definitions")
    @Operation(summary = "Save standard report definition", description = "Persists a saved standard report definition for later reuse")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StandardReportDefinitionResponseDTO> saveDefinition(@Valid @RequestBody StandardReportDefinitionRequestDTO request) {
        return ResponseEntity.ok(reportService.saveStandardDefinition(request));
    }

    @DeleteMapping("/definitions/{definitionId}")
    @Operation(summary = "Delete standard report definition", description = "Archives a saved standard report definition")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> deleteDefinition(@PathVariable UUID definitionId) {
        reportService.deleteStandardDefinition(definitionId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/definitions/{definitionId}/run")
    @Operation(summary = "Run saved standard report definition", description = "Generates a standard report from a saved definition")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GeneratedReportResponseDTO> runDefinition(@PathVariable UUID definitionId) {
        return ResponseEntity.ok(reportService.runStandardDefinition(definitionId));
    }

    @PostMapping(value = "/export/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Export standard report as PDF", description = "Generate a deterministic CRM report PDF from backend data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportPdf(@Valid @RequestBody ReportGenerateRequestDTO request) {
        byte[] pdf = reportService.exportReportPdf(request);
        String reportType = request.getReportType() != null ? request.getReportType().trim().toLowerCase().replace(' ', '_') : "report";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + reportType + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PostMapping(value = "/export/xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @Operation(summary = "Export standard report as XLSX", description = "Generate a deterministic CRM report spreadsheet from backend data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportXlsx(@Valid @RequestBody ReportGenerateRequestDTO request) {
        byte[] workbook = reportService.exportReportXlsx(request);
        String reportType = request.getReportType() != null ? request.getReportType().trim().toLowerCase().replace(' ', '_') : "report";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + reportType + ".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(workbook);
    }
}
