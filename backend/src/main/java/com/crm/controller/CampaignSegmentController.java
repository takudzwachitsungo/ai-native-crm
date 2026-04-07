package com.crm.controller;

import com.crm.dto.request.CampaignSegmentRequestDTO;
import com.crm.dto.response.CampaignSegmentPreviewDTO;
import com.crm.dto.response.CampaignSegmentResponseDTO;
import com.crm.service.CampaignSegmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/segments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Campaign Segments", description = "Reusable marketing segment endpoints")
public class CampaignSegmentController {

    private final CampaignSegmentService campaignSegmentService;

    @GetMapping
    @Operation(summary = "List campaign segments")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<List<CampaignSegmentResponseDTO>> getSegments() {
        return ResponseEntity.ok(campaignSegmentService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get campaign segment by ID")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<CampaignSegmentResponseDTO> getSegment(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignSegmentService.findById(id));
    }

    @GetMapping("/{id}/preview")
    @Operation(summary = "Preview campaign segment audience")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<CampaignSegmentPreviewDTO> previewSegment(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignSegmentService.preview(id));
    }

    @PostMapping
    @Operation(summary = "Create campaign segment")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<CampaignSegmentResponseDTO> createSegment(@Valid @RequestBody CampaignSegmentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignSegmentService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update campaign segment")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<CampaignSegmentResponseDTO> updateSegment(
            @PathVariable UUID id,
            @Valid @RequestBody CampaignSegmentRequestDTO request
    ) {
        return ResponseEntity.ok(campaignSegmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive campaign segment")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<Void> deleteSegment(@PathVariable UUID id) {
        campaignSegmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
