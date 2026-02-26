package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.UserCreateRequestDTO;
import com.crm.dto.request.UserRoleUpdateRequestDTO;
import com.crm.dto.request.UserStatusUpdateRequestDTO;
import com.crm.dto.response.UserResponseDTO;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.UserMapper;
import com.crm.repository.UserRepository;
import com.crm.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponseDTO> findAll(Pageable pageable) {
        UUID tenantId = requireTenant();
        return userRepository.findByTenantIdAndArchivedFalse(tenantId, pageable)
                .map(userMapper::toDto);
    }

    @Override
    @Transactional
    public UserResponseDTO create(UserCreateRequestDTO request) {
        UUID tenantId = requireTenant();

        userRepository.findByTenantIdAndEmailAndArchivedFalse(tenantId, request.getEmail())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("User", "email", request.getEmail());
                });

        User user = userMapper.toEntity(request);
        user.setTenantId(tenantId);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        User saved = userRepository.save(user);
        log.info("Created tenant user {} for tenant {}", saved.getEmail(), tenantId);

        return userMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserResponseDTO updateRole(UUID id, UserRoleUpdateRequestDTO request) {
        UUID tenantId = requireTenant();
        User user = findTenantUser(id, tenantId);

        user.setRole(request.getRole());
        User saved = userRepository.save(user);
        log.info("Updated user role for {} in tenant {}", id, tenantId);

        return userMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserResponseDTO updateStatus(UUID id, UserStatusUpdateRequestDTO request) {
        UUID tenantId = requireTenant();
        User user = findTenantUser(id, tenantId);

        UUID currentUserId = getCurrentUserId();
        if (Boolean.FALSE.equals(request.getIsActive()) && currentUserId != null && currentUserId.equals(id)) {
            throw new BadRequestException("You cannot deactivate your own account");
        }

        user.setIsActive(request.getIsActive());
        User saved = userRepository.save(user);
        log.info("Updated user status for {} in tenant {} to {}", id, tenantId, request.getIsActive());

        return userMapper.toDto(saved);
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private User findTenantUser(UUID id, UUID tenantId) {
        return userRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return null;
        }
        return ((User) authentication.getPrincipal()).getId();
    }
}
