package com.crm.controller;

import com.crm.dto.request.NurtureJourneyRequestDTO;
import com.crm.dto.request.NurtureJourneyStepRequestDTO;
import com.crm.dto.response.NurtureJourneyResponseDTO;
import com.crm.dto.response.NurtureJourneyStepResponseDTO;
import com.crm.service.NurtureJourneyService;
import com.crm.service.NurtureJourneyStepService;
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
@RequestMapping("/api/v1/campaigns/journeys")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Nurture Journeys", description = "Reusable nurture journey endpoints")
public class NurtureJourneyController {

    private final NurtureJourneyService nurtureJourneyService;
    private final NurtureJourneyStepService nurtureJourneyStepService;

    @GetMapping
    @Operation(summary = "List nurture journeys")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<List<NurtureJourneyResponseDTO>> getJourneys() {
        return ResponseEntity.ok(nurtureJourneyService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get nurture journey by ID")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<NurtureJourneyResponseDTO> getJourney(@PathVariable UUID id) {
        return ResponseEntity.ok(nurtureJourneyService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create nurture journey")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<NurtureJourneyResponseDTO> createJourney(@Valid @RequestBody NurtureJourneyRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(nurtureJourneyService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update nurture journey")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<NurtureJourneyResponseDTO> updateJourney(
            @PathVariable UUID id,
            @Valid @RequestBody NurtureJourneyRequestDTO request
    ) {
        return ResponseEntity.ok(nurtureJourneyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive nurture journey")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<Void> deleteJourney(@PathVariable UUID id) {
        nurtureJourneyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/steps")
    @Operation(summary = "List nurture journey steps")
    @PreAuthorize("hasAuthority('MARKETING_VIEW')")
    public ResponseEntity<List<NurtureJourneyStepResponseDTO>> getJourneySteps(@PathVariable UUID id) {
        return ResponseEntity.ok(nurtureJourneyStepService.findAll(id));
    }

    @PostMapping("/{id}/steps")
    @Operation(summary = "Create nurture journey step")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<NurtureJourneyStepResponseDTO> createJourneyStep(
            @PathVariable UUID id,
            @Valid @RequestBody NurtureJourneyStepRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(nurtureJourneyStepService.create(id, request));
    }

    @PutMapping("/{id}/steps/{stepId}")
    @Operation(summary = "Update nurture journey step")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<NurtureJourneyStepResponseDTO> updateJourneyStep(
            @PathVariable UUID id,
            @PathVariable UUID stepId,
            @Valid @RequestBody NurtureJourneyStepRequestDTO request
    ) {
        return ResponseEntity.ok(nurtureJourneyStepService.update(id, stepId, request));
    }

    @DeleteMapping("/{id}/steps/{stepId}")
    @Operation(summary = "Archive nurture journey step")
    @PreAuthorize("hasAuthority('MARKETING_MANAGE')")
    public ResponseEntity<Void> deleteJourneyStep(
            @PathVariable UUID id,
            @PathVariable UUID stepId
    ) {
        nurtureJourneyStepService.delete(id, stepId);
        return ResponseEntity.noContent().build();
    }
}
