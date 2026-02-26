package com.crm.controller;

import com.crm.dto.request.InvoiceFilterDTO;
import com.crm.dto.request.InvoiceRequestDTO;
import com.crm.dto.response.InvoiceResponseDTO;
import com.crm.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Invoices", description = "Invoice management endpoints")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @Operation(summary = "Get all invoices", description = "Get paginated list of invoices with optional filtering")
    public ResponseEntity<Page<InvoiceResponseDTO>> getAllInvoices(
            @PageableDefault(size = 20, sort = "issueDate", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute InvoiceFilterDTO filter
    ) {
        return ResponseEntity.ok(invoiceService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice by ID", description = "Get detailed information about a specific invoice")
    public ResponseEntity<InvoiceResponseDTO> getInvoiceById(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new invoice", description = "Create a new invoice with line items")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<InvoiceResponseDTO> createInvoice(@Valid @RequestBody InvoiceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update invoice", description = "Update an existing invoice")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<InvoiceResponseDTO> updateInvoice(
            @PathVariable UUID id,
            @Valid @RequestBody InvoiceRequestDTO request
    ) {
        return ResponseEntity.ok(invoiceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete invoice", description = "Delete an invoice (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteInvoice(@PathVariable UUID id) {
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete invoices", description = "Delete multiple invoices at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteInvoices(@RequestBody List<UUID> ids) {
        invoiceService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update invoice status", description = "Update the status of an invoice")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<InvoiceResponseDTO> updateInvoiceStatus(
            @PathVariable UUID id,
            @RequestParam String status
    ) {
        return ResponseEntity.ok(invoiceService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/mark-paid")
    @Operation(summary = "Mark invoice as paid", description = "Mark an invoice as paid with optional paid date")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<InvoiceResponseDTO> markInvoiceAsPaid(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paidDate
    ) {
        return ResponseEntity.ok(invoiceService.markAsPaid(id, paidDate));
    }

    @GetMapping("/overdue")
    @Operation(summary = "Get overdue invoices", description = "Get all invoices that are overdue")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<List<InvoiceResponseDTO>> getOverdueInvoices() {
        return ResponseEntity.ok(invoiceService.findOverdueInvoices());
    }
}
