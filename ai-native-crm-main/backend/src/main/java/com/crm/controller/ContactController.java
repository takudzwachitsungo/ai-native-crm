package com.crm.controller;

import com.crm.dto.request.ContactFilterDTO;
import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.response.ContactResponseDTO;
import com.crm.service.ContactService;
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
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Contacts", description = "Contact management endpoints")
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    @Operation(summary = "Get all contacts", description = "Get paginated list of contacts with optional filtering")
    public ResponseEntity<Page<ContactResponseDTO>> getAllContacts(
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable,
            @ModelAttribute ContactFilterDTO filter
    ) {
        return ResponseEntity.ok(contactService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get contact by ID", description = "Get detailed information about a specific contact")
    public ResponseEntity<ContactResponseDTO> getContactById(@PathVariable UUID id) {
        return ResponseEntity.ok(contactService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new contact", description = "Create a new contact")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<ContactResponseDTO> createContact(@Valid @RequestBody ContactRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contactService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update contact", description = "Update an existing contact")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<ContactResponseDTO> updateContact(
            @PathVariable UUID id,
            @Valid @RequestBody ContactRequestDTO request
    ) {
        return ResponseEntity.ok(contactService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete contact", description = "Delete a contact (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteContact(@PathVariable UUID id) {
        contactService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete contacts", description = "Delete multiple contacts at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteContacts(@RequestBody List<UUID> ids) {
        contactService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-company/{companyId}")
    @Operation(summary = "Get contacts by company", description = "Get all contacts for a specific company")
    public ResponseEntity<List<ContactResponseDTO>> getContactsByCompany(@PathVariable UUID companyId) {
        return ResponseEntity.ok(contactService.findByCompany(companyId));
    }

    @GetMapping("/search")
    @Operation(summary = "Search contacts", description = "Search contacts by name or email")
    public ResponseEntity<List<ContactResponseDTO>> searchContacts(@RequestParam String query) {
        return ResponseEntity.ok(contactService.searchContacts(query));
    }
}
