package com.crm.controller;

import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.request.CompanyTerritoryReassignmentRequestDTO;
import com.crm.dto.response.CompanyInsightsResponseDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.dto.response.CompanyTerritoryQueueSummaryDTO;
import com.crm.dto.response.CompanyTerritoryReassignmentResultDTO;
import com.crm.service.CompanyService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Companies", description = "Company management endpoints")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    @Operation(summary = "Get all companies", description = "Get paginated list of companies with optional filtering")
    public ResponseEntity<Page<CompanyResponseDTO>> getAllCompanies(
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable,
            @ModelAttribute CompanyFilterDTO filter
    ) {
        return ResponseEntity.ok(companyService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get company by ID", description = "Get detailed information about a specific company")
    public ResponseEntity<CompanyResponseDTO> getCompanyById(@PathVariable UUID id) {
        return ResponseEntity.ok(companyService.findById(id));
    }

    @GetMapping("/{id}/insights")
    @Operation(summary = "Get company insights", description = "Get account health, stakeholder coverage, pipeline exposure, and next actions for a company")
    public ResponseEntity<CompanyInsightsResponseDTO> getCompanyInsights(@PathVariable UUID id) {
        return ResponseEntity.ok(companyService.getInsights(id));
    }

    @GetMapping("/governance/territory-queue")
    @Operation(summary = "Get company territory governance queue", description = "Get accounts whose owner coverage does not match their territory")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<CompanyTerritoryQueueSummaryDTO> getTerritoryGovernanceQueue() {
        return ResponseEntity.ok(companyService.getTerritoryGovernanceQueue());
    }

    @PostMapping("/governance/reassign")
    @Operation(summary = "Reassign company territory mismatches", description = "Bulk reassign account owners to territory-matched workspace users")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<CompanyTerritoryReassignmentResultDTO> reassignTerritoryMismatches(
            @RequestBody(required = false) CompanyTerritoryReassignmentRequestDTO request
    ) {
        return ResponseEntity.ok(companyService.reassignTerritoryMismatches(request));
    }

    @PostMapping
    @Operation(summary = "Create new company", description = "Create a new company")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<CompanyResponseDTO> createCompany(@Valid @RequestBody CompanyRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(companyService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update company", description = "Update an existing company")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<CompanyResponseDTO> updateCompany(
            @PathVariable UUID id,
            @Valid @RequestBody CompanyRequestDTO request
    ) {
        return ResponseEntity.ok(companyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete company", description = "Delete a company (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteCompany(@PathVariable UUID id) {
        companyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete companies", description = "Delete multiple companies at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteCompanies(@RequestBody List<UUID> ids) {
        companyService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search companies by name", description = "Search companies by name with autocomplete")
    public ResponseEntity<List<CompanyResponseDTO>> searchCompanies(@RequestParam String name) {
        return ResponseEntity.ok(companyService.searchByName(name));
    }
}
