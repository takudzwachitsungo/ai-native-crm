package com.crm.controller;

import com.crm.dto.request.DocumentFilterDTO;
import com.crm.dto.request.DocumentRequestDTO;
import com.crm.dto.response.DocumentResponseDTO;
import com.crm.service.DocumentService;
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
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Documents", description = "Document management endpoints")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    @Operation(summary = "Get all documents", description = "Get paginated list of documents with optional filtering")
    public ResponseEntity<Page<DocumentResponseDTO>> getAllDocuments(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute DocumentFilterDTO filter
    ) {
        return ResponseEntity.ok(documentService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get document by ID", description = "Get detailed information about a specific document")
    public ResponseEntity<DocumentResponseDTO> getDocumentById(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new document", description = "Create a new document record")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<DocumentResponseDTO> createDocument(@Valid @RequestBody DocumentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update document", description = "Update an existing document")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<DocumentResponseDTO> updateDocument(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentRequestDTO request
    ) {
        return ResponseEntity.ok(documentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete document", description = "Delete a document (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete documents", description = "Delete multiple documents at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteDocuments(@RequestBody List<UUID> ids) {
        documentService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/related")
    @Operation(summary = "Get documents by related entity", description = "Get all documents related to a specific entity")
    public ResponseEntity<List<DocumentResponseDTO>> getDocumentsByRelatedEntity(
            @RequestParam String entityType,
            @RequestParam UUID entityId
    ) {
        return ResponseEntity.ok(documentService.findByRelatedEntity(entityType, entityId));
    }
}
