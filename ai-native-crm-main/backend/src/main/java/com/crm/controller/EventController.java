package com.crm.controller;

import com.crm.dto.request.EventFilterDTO;
import com.crm.dto.request.EventRequestDTO;
import com.crm.dto.response.EventResponseDTO;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.service.EventService;
import com.crm.service.WorkspaceGoogleWorkspaceSyncService;
import com.crm.service.WorkspaceMicrosoft365SyncService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Events", description = "Calendar and event management endpoints")
public class EventController {

    private final EventService eventService;
    private final WorkspaceMicrosoft365SyncService workspaceMicrosoft365SyncService;
    private final WorkspaceGoogleWorkspaceSyncService workspaceGoogleWorkspaceSyncService;

    @GetMapping
    @Operation(summary = "Get all events", description = "Get paginated list of events with optional filtering")
    public ResponseEntity<Page<EventResponseDTO>> getAllEvents(
            @PageableDefault(size = 20, sort = "startDateTime", direction = Sort.Direction.ASC) Pageable pageable,
            @ModelAttribute EventFilterDTO filter
    ) {
        return ResponseEntity.ok(eventService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID", description = "Get detailed information about a specific event")
    public ResponseEntity<EventResponseDTO> getEventById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new event", description = "Create a new calendar event")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<EventResponseDTO> createEvent(@Valid @RequestBody EventRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update event", description = "Update an existing event")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<EventResponseDTO> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody EventRequestDTO request
    ) {
        return ResponseEntity.ok(eventService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete event", description = "Delete an event (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        eventService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete events", description = "Delete multiple events at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteEvents(@RequestBody List<UUID> ids) {
        eventService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/calendar")
    @Operation(summary = "Get events by date range", description = "Get events between specified dates")
    public ResponseEntity<List<EventResponseDTO>> getEventsBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        return ResponseEntity.ok(eventService.findEventsBetween(startTime, endTime));
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming events", description = "Get events scheduled in the next N days")
    public ResponseEntity<List<EventResponseDTO>> getUpcomingEvents(
            @RequestParam(defaultValue = "7") int days
    ) {
        return ResponseEntity.ok(eventService.findUpcomingEvents(days));
    }

    @PostMapping("/sync/microsoft-365")
    @Operation(summary = "Sync Microsoft 365 calendar", description = "Imports upcoming Microsoft 365 calendar events into the CRM calendar")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    public ResponseEntity<IntegrationSyncResultDTO> syncMicrosoft365Events() {
        return ResponseEntity.ok(workspaceMicrosoft365SyncService.syncEvents());
    }

    @PostMapping("/sync/google-workspace")
    @Operation(summary = "Sync Google Workspace calendar", description = "Imports upcoming Google Calendar events into the CRM calendar")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    public ResponseEntity<IntegrationSyncResultDTO> syncGoogleWorkspaceEvents() {
        return ResponseEntity.ok(workspaceGoogleWorkspaceSyncService.syncEvents());
    }
}
