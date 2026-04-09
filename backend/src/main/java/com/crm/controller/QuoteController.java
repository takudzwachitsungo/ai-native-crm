package com.crm.controller;

import com.crm.dto.request.QuoteFilterDTO;
import com.crm.dto.request.QuoteRequestDTO;
import com.crm.dto.response.QuoteResponseDTO;
import com.crm.service.QuoteService;
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
@RequestMapping("/api/v1/quotes")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Quotes", description = "Quote management endpoints")
public class QuoteController {

    private final QuoteService quoteService;

    @GetMapping
    @Operation(summary = "Get all quotes", description = "Get paginated list of quotes with optional filtering")
    @PreAuthorize("hasAuthority('REVENUE_VIEW')")
    public ResponseEntity<Page<QuoteResponseDTO>> getAllQuotes(
            @PageableDefault(size = 20, sort = "issueDate", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute QuoteFilterDTO filter
    ) {
        return ResponseEntity.ok(quoteService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get quote by ID", description = "Get detailed information about a specific quote")
    @PreAuthorize("hasAuthority('REVENUE_VIEW')")
    public ResponseEntity<QuoteResponseDTO> getQuoteById(@PathVariable UUID id) {
        return ResponseEntity.ok(quoteService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new quote", description = "Create a new quote with line items")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<QuoteResponseDTO> createQuote(@Valid @RequestBody QuoteRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quoteService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update quote", description = "Update an existing quote")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<QuoteResponseDTO> updateQuote(
            @PathVariable UUID id,
            @Valid @RequestBody QuoteRequestDTO request
    ) {
        return ResponseEntity.ok(quoteService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete quote", description = "Delete a quote (soft delete)")
    @PreAuthorize("hasAuthority('REVENUE_MANAGE')")
    public ResponseEntity<Void> deleteQuote(@PathVariable UUID id) {
        quoteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete quotes", description = "Delete multiple quotes at once")
    @PreAuthorize("hasAuthority('REVENUE_MANAGE')")
    public ResponseEntity<Void> bulkDeleteQuotes(@RequestBody List<UUID> ids) {
        quoteService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update quote status", description = "Update the status of a quote")
    @PreAuthorize("hasAuthority('REVENUE_WRITE')")
    public ResponseEntity<QuoteResponseDTO> updateQuoteStatus(
            @PathVariable UUID id,
            @RequestParam String status
    ) {
        return ResponseEntity.ok(quoteService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/approve-pricing")
    @Operation(summary = "Approve quote pricing", description = "Approve custom pricing on a quote so it can advance")
    @PreAuthorize("hasAuthority('REVENUE_MANAGE')")
    public ResponseEntity<QuoteResponseDTO> approveQuotePricing(@PathVariable UUID id) {
        return ResponseEntity.ok(quoteService.approvePricing(id));
    }
}
