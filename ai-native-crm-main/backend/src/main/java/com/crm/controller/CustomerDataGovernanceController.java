package com.crm.controller;

import com.crm.dto.response.CustomerDataGovernanceSummaryDTO;
import com.crm.dto.response.CustomerDuplicateCandidateDTO;
import com.crm.dto.response.CustomerRecordMergeResultDTO;
import com.crm.service.CustomerDataGovernanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/data-governance")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Customer Data Governance", description = "Customer data hygiene, consent, privacy, and deduplication endpoints")
public class CustomerDataGovernanceController {

    private final CustomerDataGovernanceService customerDataGovernanceService;

    @GetMapping("/summary")
    @Operation(summary = "Get customer data governance summary", description = "Get tenant-wide customer data hygiene, consent, privacy, enrichment, and duplicate metrics")
    @PreAuthorize("hasAuthority('DATA_GOVERNANCE_VIEW')")
    public ResponseEntity<CustomerDataGovernanceSummaryDTO> getSummary() {
        return ResponseEntity.ok(customerDataGovernanceService.getSummary());
    }

    @GetMapping("/duplicates")
    @Operation(summary = "Get duplicate candidates", description = "Get duplicate lead, contact, and company groups that should be reviewed")
    @PreAuthorize("hasAuthority('DATA_GOVERNANCE_VIEW')")
    public ResponseEntity<List<CustomerDuplicateCandidateDTO>> getDuplicateCandidates() {
        return ResponseEntity.ok(customerDataGovernanceService.getDuplicateCandidates());
    }

    @PostMapping("/contacts/{targetContactId}/merge/{sourceContactId}")
    @Operation(summary = "Merge duplicate contacts", description = "Merge a duplicate source contact into a target contact and rewire downstream references")
    @PreAuthorize("hasAuthority('DATA_GOVERNANCE_MANAGE')")
    public ResponseEntity<CustomerRecordMergeResultDTO> mergeContacts(
            @PathVariable UUID targetContactId,
            @PathVariable UUID sourceContactId
    ) {
        return ResponseEntity.ok(customerDataGovernanceService.mergeContacts(targetContactId, sourceContactId));
    }
}
