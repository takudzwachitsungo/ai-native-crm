package com.crm.controller;

import com.crm.dto.request.ReportGenerateRequestDTO;
import com.crm.dto.response.GeneratedReportResponseDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;
import com.crm.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

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
}
