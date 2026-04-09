package com.crm.controller;

import com.crm.dto.request.UserCreateRequestDTO;
import com.crm.dto.request.UserHierarchyUpdateRequestDTO;
import com.crm.dto.request.UserRevenueOpsUpdateRequestDTO;
import com.crm.dto.request.UserRoleUpdateRequestDTO;
import com.crm.dto.request.UserStatusUpdateRequestDTO;
import com.crm.dto.response.UserResponseDTO;
import com.crm.service.UserManagementService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Users", description = "Tenant user management endpoints")
@PreAuthorize("hasAuthority('USERS_MANAGE')")
public class UserController {

    private final UserManagementService userManagementService;

    @GetMapping
    @Operation(summary = "List tenant users", description = "Get paginated users for the authenticated tenant")
    public ResponseEntity<Page<UserResponseDTO>> getUsers(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(userManagementService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get tenant user", description = "Get a single user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> getUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userManagementService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create tenant user", description = "Create a new user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserCreateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userManagementService.create(request));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Update user role", description = "Update role of a user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> updateUserRole(
            @PathVariable UUID id,
            @Valid @RequestBody UserRoleUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(userManagementService.updateRole(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update user status", description = "Activate or deactivate a user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UserStatusUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(userManagementService.updateStatus(id, request));
    }

    @PatchMapping("/{id}/revenue-ops")
    @Operation(summary = "Update user quota and territory", description = "Update revenue operations fields for a user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> updateRevenueOps(
            @PathVariable UUID id,
            @Valid @RequestBody UserRevenueOpsUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(userManagementService.updateRevenueOps(id, request));
    }

    @PatchMapping("/{id}/hierarchy")
    @Operation(summary = "Update user reporting line", description = "Assign or clear a manager for a user in the authenticated tenant")
    public ResponseEntity<UserResponseDTO> updateHierarchy(
            @PathVariable UUID id,
            @Valid @RequestBody UserHierarchyUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(userManagementService.updateHierarchy(id, request));
    }
}
