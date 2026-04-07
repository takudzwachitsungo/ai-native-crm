package com.crm.controller;

import com.crm.dto.request.AutomationRuleRequestDTO;
import com.crm.dto.response.AutomationRuleResponseDTO;
import com.crm.entity.enums.AutomationEventType;
import com.crm.service.AutomationRuleService;
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
@RequestMapping("/api/v1/automation-rules")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Automation Rules", description = "Generic event-condition-action automation rules")
public class AutomationRuleController {

    private final AutomationRuleService automationRuleService;

    @GetMapping
    @PreAuthorize("hasAuthority('AUTOMATION_VIEW')")
    @Operation(summary = "List automation rules", description = "List generic automation rules for the authenticated tenant")
    public ResponseEntity<List<AutomationRuleResponseDTO>> getAutomationRules() {
        return ResponseEntity.ok(automationRuleService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AUTOMATION_VIEW')")
    @Operation(summary = "Get automation rule", description = "Get a generic automation rule by id")
    public ResponseEntity<AutomationRuleResponseDTO> getAutomationRule(@PathVariable UUID id) {
        return ResponseEntity.ok(automationRuleService.findById(id));
    }

    @GetMapping("/event/{eventType}")
    @PreAuthorize("hasAuthority('AUTOMATION_VIEW')")
    @Operation(summary = "List rules by event", description = "List generic automation rules that apply to a trigger event")
    public ResponseEntity<List<AutomationRuleResponseDTO>> getRulesByEventType(
            @PathVariable AutomationEventType eventType,
            @RequestParam(defaultValue = "true") boolean activeOnly
    ) {
        return ResponseEntity.ok(automationRuleService.findByEventType(eventType, activeOnly));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('AUTOMATION_MANAGE')")
    @Operation(summary = "Create automation rule", description = "Create a generic event-condition-action automation rule")
    public ResponseEntity<AutomationRuleResponseDTO> createAutomationRule(
            @Valid @RequestBody AutomationRuleRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(automationRuleService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AUTOMATION_MANAGE')")
    @Operation(summary = "Update automation rule", description = "Update a generic event-condition-action automation rule")
    public ResponseEntity<AutomationRuleResponseDTO> updateAutomationRule(
            @PathVariable UUID id,
            @Valid @RequestBody AutomationRuleRequestDTO request
    ) {
        return ResponseEntity.ok(automationRuleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('AUTOMATION_MANAGE')")
    @Operation(summary = "Archive automation rule", description = "Archive a generic event-condition-action automation rule")
    public ResponseEntity<Void> deleteAutomationRule(@PathVariable UUID id) {
        automationRuleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
