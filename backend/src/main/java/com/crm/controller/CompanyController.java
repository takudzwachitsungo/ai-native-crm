package com.crm.controller;

import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.response.CompanyResponseDTO;
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
