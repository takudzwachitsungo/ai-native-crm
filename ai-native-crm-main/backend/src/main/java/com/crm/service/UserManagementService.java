package com.crm.service;

import com.crm.dto.request.UserCreateRequestDTO;
import com.crm.dto.request.UserHierarchyUpdateRequestDTO;
import com.crm.dto.request.UserRevenueOpsUpdateRequestDTO;
import com.crm.dto.request.UserRoleUpdateRequestDTO;
import com.crm.dto.request.UserStatusUpdateRequestDTO;
import com.crm.dto.response.UserResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserManagementService {

    Page<UserResponseDTO> findAll(Pageable pageable);

    UserResponseDTO findById(UUID id);

    UserResponseDTO create(UserCreateRequestDTO request);

    UserResponseDTO updateRole(UUID id, UserRoleUpdateRequestDTO request);

    UserResponseDTO updateStatus(UUID id, UserStatusUpdateRequestDTO request);

    UserResponseDTO updateRevenueOps(UUID id, UserRevenueOpsUpdateRequestDTO request);

    UserResponseDTO updateHierarchy(UUID id, UserHierarchyUpdateRequestDTO request);
}
