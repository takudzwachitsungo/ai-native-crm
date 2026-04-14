package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.WorkOrderCompletionRequestDTO;
import com.crm.dto.request.WorkOrderFilterDTO;
import com.crm.dto.request.WorkOrderRequestDTO;
import com.crm.dto.response.FieldTechnicianWorkloadDTO;
import com.crm.dto.response.WorkOrderResponseDTO;
import com.crm.dto.response.WorkOrderStatsDTO;
import com.crm.entity.Company;
import com.crm.entity.SupportCase;
import com.crm.entity.User;
import com.crm.entity.WorkOrder;
import com.crm.entity.enums.UserRole;
import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.WorkOrderMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.SupportCaseRepository;
import com.crm.repository.UserRepository;
import com.crm.repository.WorkOrderRepository;
import com.crm.service.WorkOrderService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkOrderServiceImpl implements WorkOrderService {

    private static final List<UserRole> TECHNICIAN_ROLES = List.of(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP);
    private static final List<WorkOrderStatus> ACTIVE_STATUSES = List.of(
            WorkOrderStatus.OPEN,
            WorkOrderStatus.SCHEDULED,
            WorkOrderStatus.DISPATCHED,
            WorkOrderStatus.IN_PROGRESS
    );

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderMapper workOrderMapper;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final SupportCaseRepository supportCaseRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<WorkOrderResponseDTO> findAll(Pageable pageable, WorkOrderFilterDTO filter) {
        UUID tenantId = requireTenant();
        List<Specification<WorkOrder>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());

        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase().trim() + "%";
                specs.add((root, query, cb) -> cb.or(
                        cb.like(cb.lower(root.get("title")), search),
                        cb.like(cb.lower(root.get("orderNumber")), search),
                        cb.like(cb.lower(root.get("description")), search)
                ));
            }
            specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            specs.add(SpecificationBuilder.equal("priority", filter.getPriority()));
            specs.add(SpecificationBuilder.equal("workType", filter.getWorkType()));
            specs.add(SpecificationBuilder.equal("assignedTechnicianId", filter.getAssignedTechnicianId()));
        }

        return workOrderRepository.findAll(SpecificationBuilder.combineWithAnd(specs), pageable)
                .map(workOrderMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkOrderResponseDTO findById(UUID id) {
        return workOrderMapper.toDto(findTenantWorkOrder(id, requireTenant()));
    }

    @Override
    @Transactional
    public WorkOrderResponseDTO create(WorkOrderRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);

        WorkOrder workOrder = workOrderMapper.toEntity(request);
        workOrder.setTenantId(tenantId);
        workOrder.setArchived(false);
        workOrder.setOrderNumber(generateOrderNumber());
        applyLinkedEntitiesDefaults(workOrder, tenantId);
        workOrder.setTerritory(resolveTerritory(workOrder, request.getTerritory()));
        workOrder.setAssignedTechnicianId(resolveTechnicianId(tenantId, workOrder.getAssignedTechnicianId(), workOrder.getTerritory()));
        workOrder.setStatus(resolveInitialStatus(workOrder.getStatus(), workOrder.getScheduledStartAt()));

        WorkOrder saved = workOrderRepository.save(workOrder);
        log.info("Created work order {} for tenant {}", saved.getId(), tenantId);
        return workOrderMapper.toDto(saved);
    }

    @Override
    @Transactional
    public WorkOrderResponseDTO update(UUID id, WorkOrderRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);
        WorkOrder workOrder = findTenantWorkOrder(id, tenantId);

        workOrderMapper.updateEntity(request, workOrder);
        applyLinkedEntitiesDefaults(workOrder, tenantId);
        workOrder.setTerritory(resolveTerritory(workOrder, request.getTerritory()));
        workOrder.setAssignedTechnicianId(resolveTechnicianId(tenantId, workOrder.getAssignedTechnicianId(), workOrder.getTerritory()));
        workOrder.setStatus(resolveInitialStatus(workOrder.getStatus(), workOrder.getScheduledStartAt()));

        WorkOrder saved = workOrderRepository.save(workOrder);
        log.info("Updated work order {} for tenant {}", id, tenantId);
        return workOrderMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = requireTenant();
        WorkOrder workOrder = findTenantWorkOrder(id, tenantId);
        workOrder.setArchived(true);
        workOrderRepository.save(workOrder);
        log.info("Archived work order {} for tenant {}", id, tenantId);
    }

    @Override
    @Transactional
    public WorkOrderResponseDTO dispatch(UUID id) {
        UUID tenantId = requireTenant();
        WorkOrder workOrder = findTenantWorkOrder(id, tenantId);
        if (workOrder.getAssignedTechnicianId() == null) {
            workOrder.setAssignedTechnicianId(resolveTechnicianId(tenantId, null, workOrder.getTerritory()));
        }
        workOrder.setStatus(WorkOrderStatus.DISPATCHED);
        workOrder.setDispatchedAt(LocalDateTime.now());
        return workOrderMapper.toDto(workOrderRepository.save(workOrder));
    }

    @Override
    @Transactional
    public WorkOrderResponseDTO start(UUID id) {
        WorkOrder workOrder = findTenantWorkOrder(id, requireTenant());
        workOrder.setStatus(WorkOrderStatus.IN_PROGRESS);
        workOrder.setStartedAt(LocalDateTime.now());
        return workOrderMapper.toDto(workOrderRepository.save(workOrder));
    }

    @Override
    @Transactional
    public WorkOrderResponseDTO complete(UUID id, WorkOrderCompletionRequestDTO request) {
        WorkOrder workOrder = findTenantWorkOrder(id, requireTenant());
        workOrder.setStatus(WorkOrderStatus.COMPLETED);
        workOrder.setCompletedAt(LocalDateTime.now());
        workOrder.setCompletionNotes(request != null ? request.getCompletionNotes() : null);
        return workOrderMapper.toDto(workOrderRepository.save(workOrder));
    }

    @Override
    @Transactional(readOnly = true)
    public WorkOrderStatsDTO getStatistics() {
        UUID tenantId = requireTenant();
        List<WorkOrder> workOrders = workOrderRepository.findByTenantIdAndArchivedFalse(tenantId);

        EnumMap<WorkOrderStatus, Long> byStatus = new EnumMap<>(WorkOrderStatus.class);
        for (WorkOrderStatus status : WorkOrderStatus.values()) {
            byStatus.put(status, 0L);
        }
        workOrders.forEach(order -> byStatus.computeIfPresent(order.getStatus(), (key, count) -> count + 1L));

        EnumMap<WorkOrderPriority, Long> byPriority = new EnumMap<>(WorkOrderPriority.class);
        for (WorkOrderPriority priority : WorkOrderPriority.values()) {
            byPriority.put(priority, 0L);
        }
        workOrders.forEach(order -> byPriority.computeIfPresent(order.getPriority(), (key, count) -> count + 1L));

        List<User> technicians = userRepository.findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(tenantId, TECHNICIAN_ROLES);
        List<FieldTechnicianWorkloadDTO> workloads = technicians.stream()
                .map(user -> FieldTechnicianWorkloadDTO.builder()
                        .technicianId(user.getId())
                        .technicianName(user.getFullName())
                        .territory(user.getTerritory())
                        .activeWorkOrders(workOrderRepository.countByTenantIdAndAssignedTechnicianIdAndStatusInAndArchivedFalse(
                                tenantId, user.getId(), ACTIVE_STATUSES
                        ))
                        .scheduledWorkOrders(workOrderRepository.countByTenantIdAndAssignedTechnicianIdAndStatusInAndArchivedFalse(
                                tenantId, user.getId(), List.of(WorkOrderStatus.SCHEDULED, WorkOrderStatus.DISPATCHED)
                        ))
                        .urgentWorkOrders(workOrderRepository.countByTenantIdAndAssignedTechnicianIdAndPriorityAndStatusInAndArchivedFalse(
                                tenantId, user.getId(), WorkOrderPriority.URGENT, ACTIVE_STATUSES
                        ))
                        .build())
                .filter(item -> item.getActiveWorkOrders() > 0)
                .toList();

        long overdueScheduled = workOrders.stream()
                .filter(order -> order.getScheduledStartAt() != null)
                .filter(order -> order.getScheduledStartAt().isBefore(LocalDateTime.now()))
                .filter(order -> order.getStatus() == WorkOrderStatus.OPEN || order.getStatus() == WorkOrderStatus.SCHEDULED)
                .count();

        return WorkOrderStatsDTO.builder()
                .totalWorkOrders((long) workOrders.size())
                .activeWorkOrders(workOrders.stream().filter(order -> ACTIVE_STATUSES.contains(order.getStatus())).count())
                .scheduledWorkOrders(workOrders.stream().filter(order -> order.getStatus() == WorkOrderStatus.SCHEDULED).count())
                .dispatchedWorkOrders(workOrders.stream().filter(order -> order.getStatus() == WorkOrderStatus.DISPATCHED).count())
                .completedWorkOrders(workOrders.stream().filter(order -> order.getStatus() == WorkOrderStatus.COMPLETED).count())
                .overdueScheduledWorkOrders(overdueScheduled)
                .workOrdersByStatus(byStatus)
                .workOrdersByPriority(byPriority)
                .technicianWorkloads(workloads)
                .build();
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private void validateRequest(WorkOrderRequestDTO request) {
        if (request.getScheduledStartAt() != null && request.getScheduledEndAt() != null
                && request.getScheduledEndAt().isBefore(request.getScheduledStartAt())) {
            throw new BadRequestException("Scheduled end time cannot be before scheduled start time");
        }
    }

    private WorkOrder findTenantWorkOrder(UUID id, UUID tenantId) {
        return workOrderRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Work order", id));
    }

    private void applyLinkedEntitiesDefaults(WorkOrder workOrder, UUID tenantId) {
        SupportCase supportCase = null;
        if (workOrder.getSupportCaseId() != null) {
            supportCase = supportCaseRepository.findById(workOrder.getSupportCaseId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElseThrow(() -> new BadRequestException("Selected support case does not belong to this workspace"));
            if (workOrder.getCompanyId() == null) {
                workOrder.setCompanyId(supportCase.getCompanyId());
            }
            if (workOrder.getContactId() == null) {
                workOrder.setContactId(supportCase.getContactId());
            }
        }

        if (workOrder.getCompanyId() != null) {
            companyRepository.findById(workOrder.getCompanyId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElseThrow(() -> new BadRequestException("Selected company does not belong to this workspace"));
        }

        if (workOrder.getContactId() != null) {
            contactRepository.findById(workOrder.getContactId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElseThrow(() -> new BadRequestException("Selected contact does not belong to this workspace"));
        }
    }

    private String resolveTerritory(WorkOrder workOrder, String requestedTerritory) {
        if (requestedTerritory != null && !requestedTerritory.isBlank()) {
            return normalize(requestedTerritory);
        }
        if (workOrder.getCompanyId() != null) {
            Optional<Company> company = companyRepository.findById(workOrder.getCompanyId());
            if (company.isPresent() && company.get().getTerritory() != null) {
                return normalize(company.get().getTerritory());
            }
        }
        return null;
    }

    private UUID resolveTechnicianId(UUID tenantId, UUID requestedTechnicianId, String territory) {
        if (requestedTechnicianId != null) {
            User technician = userRepository.findByIdAndTenantIdAndArchivedFalse(requestedTechnicianId, tenantId)
                    .orElseThrow(() -> new BadRequestException("Selected technician does not belong to this workspace"));
            if (!Boolean.TRUE.equals(technician.getIsActive())) {
                throw new BadRequestException("Selected technician is inactive");
            }
            return technician.getId();
        }

        List<User> technicians = userRepository.findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(tenantId, TECHNICIAN_ROLES);
        if (technicians.isEmpty()) {
            return null;
        }

        String normalizedTerritory = normalize(territory);
        return technicians.stream()
                .sorted(Comparator
                        .comparingInt((User user) -> territoryMatchScore(user, normalizedTerritory))
                        .thenComparingLong(user -> workOrderRepository.countByTenantIdAndAssignedTechnicianIdAndStatusInAndArchivedFalse(
                                tenantId,
                                user.getId(),
                                ACTIVE_STATUSES
                        ))
                        .thenComparing(User::getFullName))
                .map(User::getId)
                .findFirst()
                .orElse(null);
    }

    private int territoryMatchScore(User user, String normalizedTerritory) {
        if (normalizedTerritory == null) {
            return 0;
        }
        if (user.getTerritory() != null && normalizedTerritory.equalsIgnoreCase(normalize(user.getTerritory()))) {
            return 0;
        }
        return 1;
    }

    private WorkOrderStatus resolveInitialStatus(WorkOrderStatus status, LocalDateTime scheduledStartAt) {
        if (status != null) {
            return status;
        }
        return scheduledStartAt != null ? WorkOrderStatus.SCHEDULED : WorkOrderStatus.OPEN;
    }

    private String generateOrderNumber() {
        return "WO-" + System.currentTimeMillis();
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }
}
