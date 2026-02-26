package com.crm.controller;

import com.crm.dto.request.UserCreateRequestDTO;
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
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class UserController {

    private final UserManagementService userManagementService;

    @GetMapping
    @Operation(summary = "List tenant users", description = "Get paginated users for the authenticated tenant")
    public ResponseEntity<Page<UserResponseDTO>> getUsers(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(userManagementService.findAll(pageable));
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
}
