package com.crm.controller;

import com.crm.dto.request.SupportCaseFilterDTO;
import com.crm.dto.request.SupportCaseRequestDTO;
import com.crm.dto.response.SupportCaseAssignmentAutomationResultDTO;
import com.crm.dto.response.SupportCaseAssignmentQueueSummaryDTO;
import com.crm.dto.response.SupportCaseOperationsDashboardDTO;
import com.crm.dto.response.SupportCaseResponseDTO;
import com.crm.dto.response.SupportCaseSlaAutomationResultDTO;
import com.crm.dto.response.SupportCaseStatsDTO;
import com.crm.service.SupportCaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cases")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Support Cases", description = "Customer service and case management endpoints")
public class SupportCaseController {

    private final SupportCaseService supportCaseService;

    @GetMapping
    @Operation(summary = "Get all support cases", description = "Get paginated list of support cases with optional filtering")
    @PreAuthorize("hasAuthority('SUPPORT_VIEW')")
    public ResponseEntity<Page<SupportCaseResponseDTO>> getAllCases(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute SupportCaseFilterDTO filter
    ) {
        return ResponseEntity.ok(supportCaseService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get support case by ID", description = "Get detailed information about a specific support case")
    @PreAuthorize("hasAuthority('SUPPORT_VIEW')")
    public ResponseEntity<SupportCaseResponseDTO> getCaseById(@PathVariable UUID id) {
        return ResponseEntity.ok(supportCaseService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create support case", description = "Create a new support case")
    @PreAuthorize("hasAuthority('SUPPORT_WRITE')")
    public ResponseEntity<SupportCaseResponseDTO> createCase(@Valid @RequestBody SupportCaseRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supportCaseService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update support case", description = "Update an existing support case")
    @PreAuthorize("hasAuthority('SUPPORT_WRITE')")
    public ResponseEntity<SupportCaseResponseDTO> updateCase(
            @PathVariable UUID id,
            @Valid @RequestBody SupportCaseRequestDTO request
    ) {
        return ResponseEntity.ok(supportCaseService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive support case", description = "Archive a support case")
    @PreAuthorize("hasAuthority('SUPPORT_MANAGE')")
    public ResponseEntity<Void> deleteCase(@PathVariable UUID id) {
        supportCaseService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/statistics", "/dashboard/operations"})
    @Operation(summary = "Get support case statistics", description = "Get support case rollup metrics")
    @PreAuthorize("hasAuthority('SUPPORT_VIEW')")
    public ResponseEntity<SupportCaseStatsDTO> getCaseStatistics() {
        return ResponseEntity.ok(supportCaseService.getStatistics());
    }

    @GetMapping("/assignment-queue")
    @PreAuthorize("hasAuthority('SUPPORT_MANAGE')")
    @Operation(summary = "Get support case assignment queue", description = "Get active unassigned or escalated support cases with suggested owners")
    public ResponseEntity<SupportCaseAssignmentQueueSummaryDTO> getAssignmentQueue() {
        return ResponseEntity.ok(supportCaseService.getAssignmentQueue());
    }

    @PostMapping("/automation/assign")
    @PreAuthorize("hasAuthority('SUPPORT_MANAGE')")
    @Operation(summary = "Run support case assignment automation", description = "Assign queued support cases to the best available owner and create assignment tasks")
    public ResponseEntity<SupportCaseAssignmentAutomationResultDTO> runAssignmentAutomation() {
        return ResponseEntity.ok(supportCaseService.runAssignmentAutomation());
    }

    @PostMapping("/automation/sla-breach")
    @PreAuthorize("hasAuthority('SUPPORT_MANAGE')")
    @Operation(summary = "Run case SLA breach automation", description = "Create follow-up tasks for response and resolution SLA breaches")
    public ResponseEntity<SupportCaseSlaAutomationResultDTO> runSlaBreachAutomation() {
        return ResponseEntity.ok(supportCaseService.runSlaBreachAutomation());
    }
}
