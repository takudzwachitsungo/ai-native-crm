package com.crm.controller;

import com.crm.dto.request.DealRescueWorkflowRequestDTO;
import com.crm.dto.request.DealApprovalWorkflowRequestDTO;
import com.crm.dto.request.GovernanceOpsWorkflowRequestDTO;
import com.crm.dto.request.LeadIntakeWorkflowRequestDTO;
import com.crm.dto.request.QuotaRiskWorkflowRequestDTO;
import com.crm.dto.request.TerritoryEscalationWorkflowRequestDTO;
import com.crm.dto.response.DealApprovalWorkflowResponseDTO;
import com.crm.dto.response.DealRescueWorkflowResponseDTO;
import com.crm.dto.response.GovernanceOpsWorkflowResponseDTO;
import com.crm.dto.response.LeadIntakeWorkflowResponseDTO;
import com.crm.dto.response.QuotaRiskWorkflowResponseDTO;
import com.crm.dto.response.TerritoryEscalationWorkflowResponseDTO;
import com.crm.service.WorkflowRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Workflow Rules", description = "Tenant workflow automation rule endpoints")
public class WorkflowRuleController {

    private final WorkflowRuleService workflowRuleService;

    @GetMapping("/lead-intake")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get lead intake workflow", description = "Get the tenant lead intake workflow configuration")
    public ResponseEntity<LeadIntakeWorkflowResponseDTO> getLeadIntakeWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getLeadIntakeWorkflow());
    }

    @PutMapping("/lead-intake")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update lead intake workflow", description = "Update the tenant lead intake workflow configuration")
    public ResponseEntity<LeadIntakeWorkflowResponseDTO> updateLeadIntakeWorkflow(
            @Valid @RequestBody LeadIntakeWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateLeadIntakeWorkflow(request));
    }

    @GetMapping("/deal-rescue")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get deal rescue workflow", description = "Get the tenant deal rescue workflow configuration")
    public ResponseEntity<DealRescueWorkflowResponseDTO> getDealRescueWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getDealRescueWorkflow());
    }

    @PutMapping("/deal-rescue")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update deal rescue workflow", description = "Update the tenant deal rescue workflow configuration")
    public ResponseEntity<DealRescueWorkflowResponseDTO> updateDealRescueWorkflow(
            @Valid @RequestBody DealRescueWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateDealRescueWorkflow(request));
    }

    @GetMapping("/quota-risk")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get quota risk workflow", description = "Get the tenant quota risk workflow configuration")
    public ResponseEntity<QuotaRiskWorkflowResponseDTO> getQuotaRiskWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getQuotaRiskWorkflow());
    }

    @PutMapping("/quota-risk")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update quota risk workflow", description = "Update the tenant quota risk workflow configuration")
    public ResponseEntity<QuotaRiskWorkflowResponseDTO> updateQuotaRiskWorkflow(
            @Valid @RequestBody QuotaRiskWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateQuotaRiskWorkflow(request));
    }

    @GetMapping("/deal-approval")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get deal approval workflow", description = "Get the tenant deal approval workflow configuration")
    public ResponseEntity<DealApprovalWorkflowResponseDTO> getDealApprovalWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getDealApprovalWorkflow());
    }

    @PutMapping("/deal-approval")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update deal approval workflow", description = "Update the tenant deal approval workflow configuration")
    public ResponseEntity<DealApprovalWorkflowResponseDTO> updateDealApprovalWorkflow(
            @Valid @RequestBody DealApprovalWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateDealApprovalWorkflow(request));
    }

    @GetMapping("/governance-ops")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get governance ops workflow", description = "Get the tenant governance digest and overdue review workflow configuration")
    public ResponseEntity<GovernanceOpsWorkflowResponseDTO> getGovernanceOpsWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getGovernanceOpsWorkflow());
    }

    @PutMapping("/governance-ops")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update governance ops workflow", description = "Update the tenant governance digest and overdue review workflow configuration")
    public ResponseEntity<GovernanceOpsWorkflowResponseDTO> updateGovernanceOpsWorkflow(
            @Valid @RequestBody GovernanceOpsWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateGovernanceOpsWorkflow(request));
    }

    @GetMapping("/territory-escalation")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Get territory escalation workflow", description = "Get the tenant territory escalation workflow configuration")
    public ResponseEntity<TerritoryEscalationWorkflowResponseDTO> getTerritoryEscalationWorkflow() {
        return ResponseEntity.ok(workflowRuleService.getTerritoryEscalationWorkflow());
    }

    @PutMapping("/territory-escalation")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Update territory escalation workflow", description = "Update the tenant territory escalation workflow configuration")
    public ResponseEntity<TerritoryEscalationWorkflowResponseDTO> updateTerritoryEscalationWorkflow(
            @Valid @RequestBody TerritoryEscalationWorkflowRequestDTO request
    ) {
        return ResponseEntity.ok(workflowRuleService.updateTerritoryEscalationWorkflow(request));
    }
}
