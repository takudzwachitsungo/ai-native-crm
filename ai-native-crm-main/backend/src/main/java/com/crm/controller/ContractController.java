package com.crm.controller;

import com.crm.dto.request.ContractFilterDTO;
import com.crm.dto.request.ContractRequestDTO;
import com.crm.dto.request.QuoteToContractRequestDTO;
import com.crm.dto.response.ContractResponseDTO;
import com.crm.service.ContractService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Contracts", description = "Contract lifecycle and CPQ foundation endpoints")
public class ContractController {

    private final ContractService contractService;

    @GetMapping
    @Operation(summary = "Get all contracts", description = "Get paginated list of contracts with optional filtering")
    @PreAuthorize("hasAuthority('REVENUE_VIEW')")
    public ResponseEntity<Page<ContractResponseDTO>> getAllContracts(
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute ContractFilterDTO filter
    ) {
        return ResponseEntity.ok(contractService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get contract by ID", description = "Get detailed information about a specific contract")
    @PreAuthorize("hasAuthority('REVENUE_VIEW')")
    public ResponseEntity<ContractResponseDTO> getContractById(@PathVariable UUID id) {
        return ResponseEntity.ok(contractService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create contract", description = "Create a new contract")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> createContract(@Valid @RequestBody ContractRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update contract", description = "Update an existing contract")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> updateContract(
            @PathVariable UUID id,
            @Valid @RequestBody ContractRequestDTO request
    ) {
        return ResponseEntity.ok(contractService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive contract", description = "Archive a contract")
    @PreAuthorize("hasAuthority('REVENUE_MANAGE')")
    public ResponseEntity<Void> deleteContract(@PathVariable UUID id) {
        contractService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate contract", description = "Activate a draft or renewal-due contract")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> activateContract(@PathVariable UUID id) {
        return ResponseEntity.ok(contractService.activate(id));
    }

    @PatchMapping("/{id}/renewal-due")
    @Operation(summary = "Mark contract renewal due", description = "Mark a contract as renewal due")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> markRenewalDue(@PathVariable UUID id) {
        return ResponseEntity.ok(contractService.markRenewalDue(id));
    }

    @PatchMapping("/{id}/generate-renewal-invoice")
    @Operation(summary = "Generate renewal invoice", description = "Create or reuse the renewal invoice for a renewal-due contract")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> generateRenewalInvoice(
            @PathVariable UUID id,
            @RequestParam(required = false) String invoiceNumber
    ) {
        return ResponseEntity.ok(contractService.generateRenewalInvoice(id, invoiceNumber));
    }

    @PostMapping("/{id}/renew")
    @Operation(summary = "Renew contract", description = "Create the next contract term from a renewal-due contract")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> renewContract(
            @PathVariable UUID id,
            @RequestParam(required = false) String contractNumber
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.renew(id, contractNumber));
    }

    @PatchMapping("/{id}/terminate")
    @Operation(summary = "Terminate contract", description = "Terminate an active or renewal-due contract")
    @PreAuthorize("hasAuthority('REVENUE_MANAGE')")
    public ResponseEntity<ContractResponseDTO> terminateContract(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(contractService.terminate(id, reason));
    }

    @PostMapping("/from-quote/{quoteId}")
    @Operation(summary = "Convert quote to contract", description = "Create a contract from an accepted quote")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<ContractResponseDTO> convertQuoteToContract(
            @PathVariable UUID quoteId,
            @Valid @RequestBody QuoteToContractRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.convertFromQuote(quoteId, request));
    }
}
