package com.crm.controller;

import com.crm.dto.request.WorkOrderCompletionRequestDTO;
import com.crm.dto.request.WorkOrderFilterDTO;
import com.crm.dto.request.WorkOrderRequestDTO;
import com.crm.dto.response.WorkOrderResponseDTO;
import com.crm.dto.response.WorkOrderStatsDTO;
import com.crm.service.WorkOrderService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/field-service/work-orders")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Field Service", description = "Field service work order endpoints")
public class WorkOrderController {

    private final WorkOrderService workOrderService;

    @GetMapping
    @PreAuthorize("hasAuthority('FIELD_SERVICE_VIEW')")
    @Operation(summary = "Get all work orders", description = "Get paginated list of field service work orders")
    public ResponseEntity<Page<WorkOrderResponseDTO>> getAllWorkOrders(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute WorkOrderFilterDTO filter
    ) {
        return ResponseEntity.ok(workOrderService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_VIEW')")
    @Operation(summary = "Get work order by ID", description = "Get detailed information about a field service work order")
    public ResponseEntity<WorkOrderResponseDTO> getWorkOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(workOrderService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('FIELD_SERVICE_WRITE')")
    @Operation(summary = "Create work order", description = "Create a new field service work order")
    public ResponseEntity<WorkOrderResponseDTO> createWorkOrder(@Valid @RequestBody WorkOrderRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workOrderService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_WRITE')")
    @Operation(summary = "Update work order", description = "Update an existing field service work order")
    public ResponseEntity<WorkOrderResponseDTO> updateWorkOrder(
            @PathVariable UUID id,
            @Valid @RequestBody WorkOrderRequestDTO request
    ) {
        return ResponseEntity.ok(workOrderService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_MANAGE')")
    @Operation(summary = "Archive work order", description = "Archive a field service work order")
    public ResponseEntity<Void> deleteWorkOrder(@PathVariable UUID id) {
        workOrderService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/dispatch")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_WRITE')")
    @Operation(summary = "Dispatch work order", description = "Dispatch a field work order to a technician")
    public ResponseEntity<WorkOrderResponseDTO> dispatchWorkOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(workOrderService.dispatch(id));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_WRITE')")
    @Operation(summary = "Start work order", description = "Mark a field work order as in progress")
    public ResponseEntity<WorkOrderResponseDTO> startWorkOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(workOrderService.start(id));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_WRITE')")
    @Operation(summary = "Complete work order", description = "Complete a field work order and store completion notes")
    public ResponseEntity<WorkOrderResponseDTO> completeWorkOrder(
            @PathVariable UUID id,
            @RequestBody(required = false) WorkOrderCompletionRequestDTO request
    ) {
        return ResponseEntity.ok(workOrderService.complete(id, request));
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('FIELD_SERVICE_VIEW')")
    @Operation(summary = "Get work order statistics", description = "Get field service workload and scheduling statistics")
    public ResponseEntity<WorkOrderStatsDTO> getStatistics() {
        return ResponseEntity.ok(workOrderService.getStatistics());
    }
}
