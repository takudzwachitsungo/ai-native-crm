package com.crm.controller;

import com.crm.dto.request.DealFilterDTO;
import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.entity.enums.DealStage;
import com.crm.service.DealService;
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
@RequestMapping("/api/v1/deals")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Deals", description = "Deal management endpoints")
public class DealController {

    private final DealService dealService;

    @GetMapping
    @Operation(summary = "Get all deals", description = "Get paginated list of deals with optional filtering")
    public ResponseEntity<Page<DealResponseDTO>> getAllDeals(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute DealFilterDTO filter
    ) {
        return ResponseEntity.ok(dealService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get deal by ID", description = "Get detailed information about a specific deal")
    public ResponseEntity<DealResponseDTO> getDealById(@PathVariable UUID id) {
        return ResponseEntity.ok(dealService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new deal", description = "Create a new deal")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<DealResponseDTO> createDeal(@Valid @RequestBody DealRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dealService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update deal", description = "Update an existing deal")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<DealResponseDTO> updateDeal(
            @PathVariable UUID id,
            @Valid @RequestBody DealRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete deal", description = "Delete a deal (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteDeal(@PathVariable UUID id) {
        dealService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete deals", description = "Delete multiple deals at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteDeals(@RequestBody List<UUID> ids) {
        dealService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stage")
    @Operation(summary = "Update deal stage", description = "Move deal to a different stage in the pipeline")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<DealResponseDTO> updateDealStage(
            @PathVariable UUID id,
            @RequestParam DealStage stage
    ) {
        return ResponseEntity.ok(dealService.updateStage(id, stage));
    }

    @GetMapping("/by-stage/{stage}")
    @Operation(summary = "Get deals by stage", description = "Get all deals in a specific pipeline stage")
    public ResponseEntity<List<DealResponseDTO>> getDealsByStage(@PathVariable DealStage stage) {
        return ResponseEntity.ok(dealService.findByStage(stage));
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get deal statistics", description = "Get aggregated statistics about deals")
    public ResponseEntity<DealStatsDTO> getDealStatistics() {
        return ResponseEntity.ok(dealService.getStatistics());
    }
}
