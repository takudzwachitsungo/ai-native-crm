package com.crm.controller;

import com.crm.dto.request.CampaignFilterDTO;
import com.crm.dto.request.CampaignRequestDTO;
import com.crm.dto.response.CampaignInsightsResponseDTO;
import com.crm.dto.response.CampaignResponseDTO;
import com.crm.dto.response.CampaignStatsDTO;
import com.crm.service.CampaignService;
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
@RequestMapping("/api/v1/campaigns")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Campaigns", description = "Campaign management endpoints")
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping
    @Operation(summary = "Get all campaigns", description = "Get paginated list of campaigns with optional filtering")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<Page<CampaignResponseDTO>> getAllCampaigns(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute CampaignFilterDTO filter
    ) {
        return ResponseEntity.ok(campaignService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get campaign by ID", description = "Get detailed information about a specific campaign")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<CampaignResponseDTO> getCampaignById(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.findById(id));
    }

    @GetMapping("/{id}/insights")
    @Operation(summary = "Get campaign insights", description = "Get attributed lead and nurture insights for a campaign")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<CampaignInsightsResponseDTO> getCampaignInsights(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.getInsights(id));
    }

    @PostMapping
    @Operation(summary = "Create campaign", description = "Create a new campaign")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<CampaignResponseDTO> createCampaign(@Valid @RequestBody CampaignRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update campaign", description = "Update an existing campaign")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<CampaignResponseDTO> updateCampaign(
            @PathVariable UUID id,
            @Valid @RequestBody CampaignRequestDTO request
    ) {
        return ResponseEntity.ok(campaignService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete campaign", description = "Archive a campaign")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<Void> deleteCampaign(@PathVariable UUID id) {
        campaignService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get campaign statistics", description = "Get campaign rollup metrics")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<CampaignStatsDTO> getCampaignStatistics() {
        return ResponseEntity.ok(campaignService.getStatistics());
    }
}
