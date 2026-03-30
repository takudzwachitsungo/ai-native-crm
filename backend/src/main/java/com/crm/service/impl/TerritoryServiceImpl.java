package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.TerritoryRequestDTO;
import com.crm.dto.response.TerritoryResponseDTO;
import com.crm.entity.Territory;
import com.crm.exception.BadRequestException;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.TerritoryRepository;
import com.crm.repository.UserRepository;
import com.crm.service.TerritoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TerritoryServiceImpl implements TerritoryService {

    private final TerritoryRepository territoryRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TerritoryResponseDTO> findAll() {
        UUID tenantId = requireTenant();
        return territoryRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public TerritoryResponseDTO create(TerritoryRequestDTO request) {
        UUID tenantId = requireTenant();
        String territoryName = canonicalizeName(request.getName());
        String normalizedName = normalizeKey(territoryName);

        territoryRepository.findByTenantIdAndNormalizedNameAndArchivedFalse(tenantId, normalizedName)
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Territory", "name", territoryName);
                });

        Territory territory = Territory.builder()
                .name(territoryName)
                .normalizedName(normalizedName)
                .description(cleanDescription(request.getDescription()))
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        territory.setTenantId(tenantId);

        Territory saved = territoryRepository.save(territory);
        log.info("Created territory {} for tenant {}", saved.getName(), tenantId);
        return toDto(saved);
    }

    @Override
    @Transactional
    public TerritoryResponseDTO update(UUID id, TerritoryRequestDTO request) {
        UUID tenantId = requireTenant();
        Territory territory = territoryRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Territory", id));

        String territoryName = canonicalizeName(request.getName());
        String normalizedName = normalizeKey(territoryName);

        territoryRepository.findByTenantIdAndNormalizedNameAndArchivedFalse(tenantId, normalizedName)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Territory", "name", territoryName);
                });

        territory.setName(territoryName);
        territory.setNormalizedName(normalizedName);
        territory.setDescription(cleanDescription(request.getDescription()));
        territory.setIsActive(request.getIsActive() != null ? request.getIsActive() : territory.getIsActive());

        Territory saved = territoryRepository.save(territory);
        log.info("Updated territory {} for tenant {}", id, tenantId);
        return toDto(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = requireTenant();
        Territory territory = territoryRepository.findByIdAndTenantIdAndArchivedFalse(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Territory", id));

        long assignedUsers = userRepository.countByTenantIdAndTerritoryAndArchivedFalse(tenantId, territory.getName());
        if (assignedUsers > 0) {
            throw new BadRequestException("Cannot delete a territory while users are still assigned to it");
        }

        territory.setArchived(true);
        territoryRepository.save(territory);
        log.info("Archived territory {} for tenant {}", id, tenantId);
    }

    private TerritoryResponseDTO toDto(Territory territory) {
        long assignedUsers = userRepository.countByTenantIdAndTerritoryAndArchivedFalse(territory.getTenantId(), territory.getName());
        return TerritoryResponseDTO.builder()
                .id(territory.getId())
                .name(territory.getName())
                .description(territory.getDescription())
                .isActive(territory.getIsActive())
                .assignedUserCount(assignedUsers)
                .createdAt(territory.getCreatedAt())
                .updatedAt(territory.getUpdatedAt())
                .build();
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private String canonicalizeName(String value) {
        if (value == null) {
            throw new BadRequestException("Territory name is required");
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            throw new BadRequestException("Territory name is required");
        }
        return normalized;
    }

    private String normalizeKey(String value) {
        return canonicalizeName(value).toLowerCase();
    }

    private String cleanDescription(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
