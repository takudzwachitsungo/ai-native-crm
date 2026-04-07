package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.UserCreateRequestDTO;
import com.crm.dto.request.UserHierarchyUpdateRequestDTO;
import com.crm.dto.request.UserRevenueOpsUpdateRequestDTO;
import com.crm.dto.request.UserRoleUpdateRequestDTO;
import com.crm.dto.request.UserStatusUpdateRequestDTO;
import com.crm.dto.response.UserResponseDTO;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.UserMapper;
import com.crm.repository.TerritoryRepository;
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
    private final TerritoryRepository territoryRepository;
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
    @Transactional(readOnly = true)
    public UserResponseDTO findById(UUID id) {
        UUID tenantId = requireTenant();
        return userMapper.toDto(findTenantUser(id, tenantId));
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
        user.setTerritory(resolveTerritoryForCreate(tenantId, request.getTerritory()));
        user.setManagerId(resolveManagerId(tenantId, request.getManagerId(), null));

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

    @Override
    @Transactional
    public UserResponseDTO updateRevenueOps(UUID id, UserRevenueOpsUpdateRequestDTO request) {
        UUID tenantId = requireTenant();
        User user = findTenantUser(id, tenantId);

        user.setTerritory(resolveTerritoryForUpdate(tenantId, user.getTerritory(), request.getTerritory()));
        user.setQuarterlyQuota(request.getQuarterlyQuota());
        user.setAnnualQuota(request.getAnnualQuota());

        User saved = userRepository.save(user);
        log.info("Updated revenue ops settings for user {} in tenant {}", id, tenantId);

        return userMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserResponseDTO updateHierarchy(UUID id, UserHierarchyUpdateRequestDTO request) {
        UUID tenantId = requireTenant();
        User user = findTenantUser(id, tenantId);
        user.setManagerId(resolveManagerId(tenantId, request.getManagerId(), user.getId()));

        User saved = userRepository.save(user);
        log.info("Updated hierarchy settings for user {} in tenant {}", id, tenantId);
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

    private String normalizeTerritory(String territory) {
        if (territory == null) {
            return null;
        }
        String normalized = territory.trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeTerritoryKey(String territory) {
        String normalized = normalizeTerritory(territory);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private String resolveTerritoryForCreate(UUID tenantId, String requestedTerritory) {
        String territory = normalizeTerritory(requestedTerritory);
        if (territory == null) {
            return null;
        }
        return resolveGovernedTerritoryName(tenantId, territory);
    }

    private String resolveTerritoryForUpdate(UUID tenantId, String currentTerritory, String requestedTerritory) {
        String territory = normalizeTerritory(requestedTerritory);
        if (territory == null) {
            return null;
        }

        if (normalizeTerritoryKey(currentTerritory) != null
                && normalizeTerritoryKey(currentTerritory).equals(normalizeTerritoryKey(territory))) {
            return normalizeTerritory(currentTerritory);
        }

        return resolveGovernedTerritoryName(tenantId, territory);
    }

    private String resolveGovernedTerritoryName(UUID tenantId, String territory) {
        return territoryRepository.findByTenantIdAndNormalizedNameAndIsActiveTrueAndArchivedFalse(
                        tenantId,
                        normalizeTerritoryKey(territory)
                )
                .map(found -> normalizeTerritory(found.getName()))
                .orElseThrow(() -> new BadRequestException("Territory must match an active workspace territory"));
    }

    private UUID resolveManagerId(UUID tenantId, UUID requestedManagerId, UUID userId) {
        if (requestedManagerId == null) {
            return null;
        }
        if (userId != null && userId.equals(requestedManagerId)) {
            throw new BadRequestException("A user cannot manage themselves");
        }
        User manager = userRepository.findByIdAndTenantIdAndArchivedFalse(requestedManagerId, tenantId)
                .orElseThrow(() -> new BadRequestException("Selected manager does not belong to this workspace"));
        if (!Boolean.TRUE.equals(manager.getIsActive())) {
            throw new BadRequestException("Selected manager is inactive");
        }
        return manager.getId();
    }
}
