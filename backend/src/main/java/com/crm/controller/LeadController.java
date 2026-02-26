package com.crm.controller;

import com.crm.dto.request.LeadFilterDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.service.LeadService;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leads")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Leads", description = "Lead management endpoints")
public class LeadController {

    private final LeadService leadService;

    @GetMapping
    @Operation(summary = "Get all leads", description = "Get paginated list of leads with optional filtering")
    public ResponseEntity<Page<LeadResponseDTO>> getAllLeads(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute LeadFilterDTO filter
    ) {
        return ResponseEntity.ok(leadService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get lead by ID", description = "Get detailed information about a specific lead")
    public ResponseEntity<LeadResponseDTO> getLeadById(@PathVariable UUID id) {
        return ResponseEntity.ok(leadService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new lead", description = "Create a new lead")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<LeadResponseDTO> createLead(@Valid @RequestBody LeadRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leadService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update lead", description = "Update an existing lead")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<LeadResponseDTO> updateLead(
            @PathVariable UUID id,
            @Valid @RequestBody LeadRequestDTO request
    ) {
        return ResponseEntity.ok(leadService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete lead", description = "Delete a lead (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteLead(@PathVariable UUID id) {
        leadService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete leads", description = "Delete multiple leads at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteLeads(@RequestBody List<UUID> ids) {
        leadService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    @Operation(summary = "Convert lead to contact", description = "Convert a lead to a contact with optional company association")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<Map<String, UUID>> convertLeadToContact(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID companyId
    ) {
        UUID contactId = leadService.convertToContact(id, companyId);
        return ResponseEntity.ok(Map.of("contactId", contactId));
    }

    @GetMapping("/high-scoring")
    @Operation(summary = "Get high-scoring leads", description = "Get leads with score above specified threshold")
    public ResponseEntity<List<LeadResponseDTO>> getHighScoringLeads(
            @RequestParam(defaultValue = "75") Integer minScore
    ) {
        return ResponseEntity.ok(leadService.findHighScoringLeads(minScore));
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get lead statistics", description = "Get aggregated statistics about leads")
    public ResponseEntity<LeadStatsDTO> getLeadStatistics() {
        return ResponseEntity.ok(leadService.getStatistics());
    }
}
