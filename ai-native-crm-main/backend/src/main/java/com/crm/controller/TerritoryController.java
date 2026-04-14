package com.crm.controller;

import com.crm.dto.request.TerritoryRequestDTO;
import com.crm.dto.response.TerritoryResponseDTO;
import com.crm.service.TerritoryService;
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
@RequestMapping("/api/v1/territories")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Territories", description = "Tenant territory governance endpoints")
public class TerritoryController {

    private final TerritoryService territoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('TERRITORY_VIEW')")
    @Operation(summary = "List workspace territories", description = "Get all workspace territories for the authenticated tenant")
    public ResponseEntity<List<TerritoryResponseDTO>> getTerritories() {
        return ResponseEntity.ok(territoryService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TERRITORY_MANAGE')")
    @Operation(summary = "Create workspace territory", description = "Create a governed territory for the authenticated tenant")
    public ResponseEntity<TerritoryResponseDTO> createTerritory(@Valid @RequestBody TerritoryRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(territoryService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TERRITORY_MANAGE')")
    @Operation(summary = "Update workspace territory", description = "Update a governed territory for the authenticated tenant")
    public ResponseEntity<TerritoryResponseDTO> updateTerritory(
            @PathVariable UUID id,
            @Valid @RequestBody TerritoryRequestDTO request
    ) {
        return ResponseEntity.ok(territoryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TERRITORY_MANAGE')")
    @Operation(summary = "Delete workspace territory", description = "Archive a governed territory that is no longer needed")
    public ResponseEntity<Void> deleteTerritory(@PathVariable UUID id) {
        territoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
