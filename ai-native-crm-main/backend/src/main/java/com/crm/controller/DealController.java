package com.crm.controller;

import com.crm.dto.request.DealFilterDTO;
import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.request.DealApprovalActionRequestDTO;
import com.crm.dto.request.DealTerritoryReassignmentRequestDTO;
import com.crm.dto.response.DealAttentionSummaryDTO;
import com.crm.dto.response.DealAutomationResultDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.dto.response.DealTerritoryQueueSummaryDTO;
import com.crm.dto.response.DealTerritoryReassignmentResultDTO;
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
    @PreAuthorize("hasAuthority('DEALS_VIEW')")
    public ResponseEntity<Page<DealResponseDTO>> getAllDeals(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute DealFilterDTO filter
    ) {
        return ResponseEntity.ok(dealService.findAll(pageable, filter));
    }

    @GetMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Get deal by ID", description = "Get detailed information about a specific deal")
    @PreAuthorize("hasAuthority('DEALS_VIEW')")
    public ResponseEntity<DealResponseDTO> getDealById(@PathVariable UUID id) {
        return ResponseEntity.ok(dealService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new deal", description = "Create a new deal")
    @PreAuthorize("hasAuthority('DEALS_WRITE')")
    public ResponseEntity<DealResponseDTO> createDeal(@Valid @RequestBody DealRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dealService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update deal", description = "Update an existing deal")
    @PreAuthorize("hasAuthority('DEALS_WRITE')")
    public ResponseEntity<DealResponseDTO> updateDeal(
            @PathVariable UUID id,
            @Valid @RequestBody DealRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete deal", description = "Delete a deal (soft delete)")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<Void> deleteDeal(@PathVariable UUID id) {
        dealService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete deals", description = "Delete multiple deals at once")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<Void> bulkDeleteDeals(@RequestBody List<UUID> ids) {
        dealService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stage")
    @Operation(summary = "Update deal stage", description = "Move deal to a different stage in the pipeline")
    @PreAuthorize("hasAuthority('DEALS_WRITE')")
    public ResponseEntity<DealResponseDTO> updateDealStage(
            @PathVariable UUID id,
            @RequestParam DealStage stage
    ) {
        return ResponseEntity.ok(dealService.updateStage(id, stage));
    }

    @GetMapping("/by-stage/{stage}")
    @Operation(summary = "Get deals by stage", description = "Get all deals in a specific pipeline stage")
    @PreAuthorize("hasAuthority('DEALS_VIEW')")
    public ResponseEntity<List<DealResponseDTO>> getDealsByStage(@PathVariable DealStage stage) {
        return ResponseEntity.ok(dealService.findByStage(stage));
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get deal statistics", description = "Get aggregated statistics about deals")
    @PreAuthorize("hasAuthority('DEALS_VIEW')")
    public ResponseEntity<DealStatsDTO> getDealStatistics() {
        return ResponseEntity.ok(dealService.getStatistics());
    }

    @GetMapping("/attention-summary")
    @Operation(summary = "Get deals needing attention", description = "Get stalled, high-risk, and overdue-next-step deals that need action")
    @PreAuthorize("hasAuthority('DEALS_VIEW')")
    public ResponseEntity<DealAttentionSummaryDTO> getAttentionSummary() {
        return ResponseEntity.ok(dealService.getAttentionSummary());
    }

    @GetMapping("/governance/territory-queue")
    @Operation(summary = "Get territory governance queue", description = "Get active deals whose owners do not match their territory with suggested in-territory owners")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<DealTerritoryQueueSummaryDTO> getTerritoryGovernanceQueue() {
        return ResponseEntity.ok(dealService.getTerritoryGovernanceQueue());
    }

    @PostMapping("/governance/reassign")
    @Operation(summary = "Bulk reassign territory mismatches", description = "Reassign territory-mismatched deals to the best suggested owner")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<DealTerritoryReassignmentResultDTO> reassignTerritoryMismatches(
            @RequestBody(required = false) DealTerritoryReassignmentRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.reassignTerritoryMismatches(
                request == null ? new DealTerritoryReassignmentRequestDTO() : request
        ));
    }

    @PostMapping("/automation/stalled-review")
    @Operation(summary = "Create rescue tasks for stalled deals", description = "Review deals needing attention and create rescue tasks where coverage is missing")
    @PreAuthorize("hasAuthority('DEALS_WRITE')")
    public ResponseEntity<DealAutomationResultDTO> runStalledReviewAutomation() {
        return ResponseEntity.ok(dealService.runStalledDealAutomation());
    }

    @PostMapping("/{id:[0-9a-fA-F\\-]{36}}/request-approval")
    @Operation(summary = "Request approval for a deal", description = "Request governance approval for a high-value or high-risk deal")
    @PreAuthorize("hasAuthority('DEALS_WRITE')")
    public ResponseEntity<DealResponseDTO> requestApproval(
            @PathVariable UUID id,
            @RequestBody(required = false) DealApprovalActionRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.requestApproval(id, request == null ? new DealApprovalActionRequestDTO() : request));
    }

    @PostMapping("/{id:[0-9a-fA-F\\-]{36}}/approve")
    @Operation(summary = "Approve a deal", description = "Approve a deal that is pending governance approval")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<DealResponseDTO> approveDeal(
            @PathVariable UUID id,
            @RequestBody(required = false) DealApprovalActionRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.approve(id, request == null ? new DealApprovalActionRequestDTO() : request));
    }

    @PostMapping("/{id:[0-9a-fA-F\\-]{36}}/reject")
    @Operation(summary = "Reject a deal approval request", description = "Reject a deal that is pending governance approval")
    @PreAuthorize("hasAuthority('DEALS_MANAGE')")
    public ResponseEntity<DealResponseDTO> rejectDeal(
            @PathVariable UUID id,
            @RequestBody(required = false) DealApprovalActionRequestDTO request
    ) {
        return ResponseEntity.ok(dealService.reject(id, request == null ? new DealApprovalActionRequestDTO() : request));
    }
}
