package com.crm.security;

import com.crm.config.TenantContext;
import com.crm.entity.Campaign;
import com.crm.entity.Company;
import com.crm.entity.Contract;
import com.crm.entity.Deal;
import com.crm.entity.Lead;
import com.crm.entity.SupportCase;
import com.crm.entity.User;
import com.crm.entity.enums.UserRole;
import com.crm.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecordAccessService {

    private final UserRepository userRepository;

    public User requireCurrentUser() {
        UUID tenantId = requireTenantId();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authenticated user context is required");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && user.getId() != null) {
            return userRepository.findByIdAndTenantIdAndArchivedFalse(user.getId(), tenantId)
                    .orElseThrow(() -> new AccessDeniedException("Authenticated user is not available in this workspace"));
        }

        return userRepository.findByTenantIdAndEmailAndArchivedFalse(tenantId, authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Authenticated user is not available in this workspace"));
    }

    public Specification<Lead> leadReadScope() {
        return buildScopeSpecification(requireCurrentUser(), AccessMode.READ, "ownerId", "territory");
    }

    public Specification<Deal> dealReadScope() {
        return buildScopeSpecification(requireCurrentUser(), AccessMode.READ, "ownerId", "territory");
    }

    public Specification<Company> companyReadScope() {
        return buildScopeSpecification(requireCurrentUser(), AccessMode.READ, "ownerId", "territory");
    }

    public Specification<Campaign> campaignReadScope() {
        return buildScopeSpecification(requireCurrentUser(), AccessMode.READ, "ownerId", "territoryFocus");
    }

    public Specification<Contract> contractReadScope() {
        return buildScopeSpecification(requireCurrentUser(), AccessMode.READ, "ownerId", "territory");
    }

    public Specification<SupportCase> supportCaseReadScope() {
        User currentUser = requireCurrentUser();
        if (hasScope(currentUser, DataAccessScope.TENANT)) {
            return null;
        }

        Set<UUID> teamMemberIds = managedUserIds(currentUser);
        String normalizedTerritory = normalizeTerritory(currentUser.getTerritory());

        return (root, query, cb) -> {
            List<Predicate> predicates = baseOwnershipPredicates(root.get("ownerId"), root.get("createdBy"), cb, currentUser, teamMemberIds, AccessMode.READ);
            if (canUseTerritoryScope(currentUser, AccessMode.READ) && normalizedTerritory != null) {
                var companyJoin = root.join("company", JoinType.LEFT);
                predicates.add(cb.equal(cb.lower(companyJoin.get("territory")), normalizedTerritory));
            }
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    public void assertCanViewLead(Lead lead) {
        assertReadable(() -> canRead(requireCurrentUser(), lead.getOwnerId(), lead.getCreatedBy(), lead.getTerritory()), "lead");
    }

    public void assertCanWriteLead(Lead lead) {
        assertReadable(() -> canWrite(requireCurrentUser(), lead.getOwnerId(), lead.getCreatedBy(), lead.getTerritory()), "lead");
    }

    public void assertCanViewDeal(Deal deal) {
        assertReadable(() -> canRead(requireCurrentUser(), deal.getOwnerId(), deal.getCreatedBy(), deal.getTerritory()), "deal");
    }

    public void assertCanWriteDeal(Deal deal) {
        assertReadable(() -> canWrite(requireCurrentUser(), deal.getOwnerId(), deal.getCreatedBy(), deal.getTerritory()), "deal");
    }

    public void assertCanViewCompany(Company company) {
        assertReadable(() -> canRead(requireCurrentUser(), company.getOwnerId(), company.getCreatedBy(), company.getTerritory()), "company");
    }

    public void assertCanWriteCompany(Company company) {
        assertReadable(() -> canWrite(requireCurrentUser(), company.getOwnerId(), company.getCreatedBy(), company.getTerritory()), "company");
    }

    public void assertCanViewCampaign(Campaign campaign) {
        assertReadable(() -> canRead(requireCurrentUser(), campaign.getOwnerId(), campaign.getCreatedBy(), campaign.getTerritoryFocus()), "campaign");
    }

    public void assertCanWriteCampaign(Campaign campaign) {
        assertReadable(() -> canWrite(requireCurrentUser(), campaign.getOwnerId(), campaign.getCreatedBy(), campaign.getTerritoryFocus()), "campaign");
    }

    public void assertCanViewContract(Contract contract) {
        assertReadable(() -> canRead(requireCurrentUser(), contract.getOwnerId(), contract.getCreatedBy(), contract.getTerritory()), "contract");
    }

    public void assertCanWriteContract(Contract contract) {
        assertReadable(() -> canWrite(requireCurrentUser(), contract.getOwnerId(), contract.getCreatedBy(), contract.getTerritory()), "contract");
    }

    public void assertCanViewSupportCase(SupportCase supportCase) {
        String territory = supportCase.getCompany() != null ? supportCase.getCompany().getTerritory() : null;
        assertReadable(() -> canRead(requireCurrentUser(), supportCase.getOwnerId(), supportCase.getCreatedBy(), territory), "support case");
    }

    public void assertCanWriteSupportCase(SupportCase supportCase) {
        String territory = supportCase.getCompany() != null ? supportCase.getCompany().getTerritory() : null;
        assertReadable(() -> canWrite(requireCurrentUser(), supportCase.getOwnerId(), supportCase.getCreatedBy(), territory), "support case");
    }

    public UUID resolveAssignableOwnerId(UUID requestedOwnerId) {
        UUID tenantId = requireTenantId();
        User currentUser = requireCurrentUser();

        if (requestedOwnerId == null) {
            return null;
        }

        User requestedOwner = userRepository.findByIdAndTenantIdAndArchivedFalse(requestedOwnerId, tenantId)
                .filter(User::getIsActive)
                .orElseThrow(() -> new AccessDeniedException("Requested owner is not available in this workspace"));

        if (hasScope(currentUser, DataAccessScope.TENANT)) {
            return requestedOwner.getId();
        }
        if (requestedOwner.getId().equals(currentUser.getId())) {
            return requestedOwner.getId();
        }
        if (hasScope(currentUser, DataAccessScope.TEAM) && managedUserIds(currentUser).contains(requestedOwner.getId())) {
            return requestedOwner.getId();
        }

        throw new AccessDeniedException("You do not have permission to assign records to this user");
    }

    public boolean canViewCampaign(Campaign campaign) {
        return canRead(requireCurrentUser(), campaign.getOwnerId(), campaign.getCreatedBy(), campaign.getTerritoryFocus());
    }

    public boolean canViewSupportCase(SupportCase supportCase) {
        return canRead(requireCurrentUser(), supportCase.getOwnerId(), supportCase.getCreatedBy(),
                supportCase.getCompany() != null ? supportCase.getCompany().getTerritory() : null);
    }

    public boolean canViewLead(Lead lead) {
        return canRead(requireCurrentUser(), lead.getOwnerId(), lead.getCreatedBy(), lead.getTerritory());
    }

    public boolean canWriteLead(Lead lead) {
        return canWrite(requireCurrentUser(), lead.getOwnerId(), lead.getCreatedBy(), lead.getTerritory());
    }

    public boolean canViewDeal(Deal deal) {
        return canRead(requireCurrentUser(), deal.getOwnerId(), deal.getCreatedBy(), deal.getTerritory());
    }

    public boolean canWriteDeal(Deal deal) {
        return canWrite(requireCurrentUser(), deal.getOwnerId(), deal.getCreatedBy(), deal.getTerritory());
    }

    public boolean canViewCompany(Company company) {
        return canRead(requireCurrentUser(), company.getOwnerId(), company.getCreatedBy(), company.getTerritory());
    }

    public boolean canWriteCompany(Company company) {
        return canWrite(requireCurrentUser(), company.getOwnerId(), company.getCreatedBy(), company.getTerritory());
    }

    public Set<UUID> managedUserIds(User currentUser) {
        if (!hasScope(currentUser, DataAccessScope.TEAM)) {
            return Set.of();
        }
        return new LinkedHashSet<>(
                userRepository.findByTenantIdAndManagerIdAndArchivedFalse(currentUser.getTenantId(), currentUser.getId()).stream()
                        .map(User::getId)
                        .collect(Collectors.toSet())
        );
    }

    private <T> Specification<T> buildScopeSpecification(User currentUser, AccessMode accessMode, String ownerField, String territoryField) {
        if (hasScope(currentUser, DataAccessScope.TENANT)) {
            return null;
        }

        Set<UUID> teamMemberIds = managedUserIds(currentUser);
        String normalizedTerritory = normalizeTerritory(currentUser.getTerritory());

        return (root, query, cb) -> {
            List<Predicate> predicates = baseOwnershipPredicates(root.get(ownerField), root.get("createdBy"), cb, currentUser, teamMemberIds, accessMode);
            if (territoryField != null && canUseTerritoryScope(currentUser, accessMode) && normalizedTerritory != null) {
                predicates.add(cb.equal(cb.lower(root.get(territoryField)), normalizedTerritory));
            }
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    private List<Predicate> baseOwnershipPredicates(
            jakarta.persistence.criteria.Path<UUID> ownerPath,
            jakarta.persistence.criteria.Path<UUID> createdByPath,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            User currentUser,
            Set<UUID> teamMemberIds,
            AccessMode accessMode
    ) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(ownerPath, currentUser.getId()));
        predicates.add(cb.equal(createdByPath, currentUser.getId()));

        if (hasScope(currentUser, DataAccessScope.TEAM) && !teamMemberIds.isEmpty()) {
            predicates.add(ownerPath.in(teamMemberIds));
            predicates.add(createdByPath.in(teamMemberIds));
        }

        if (accessMode == AccessMode.WRITE && currentUser.getRole() == UserRole.SALES_REP) {
            return predicates.subList(0, 2);
        }

        return predicates;
    }

    private boolean canRead(User currentUser, UUID ownerId, UUID createdBy, String territory) {
        if (hasScope(currentUser, DataAccessScope.TENANT)) {
            return true;
        }
        if (matchesUserOrCreatedBy(currentUser.getId(), ownerId, createdBy)) {
            return true;
        }
        Set<UUID> teamMemberIds = managedUserIds(currentUser);
        if (hasScope(currentUser, DataAccessScope.TEAM) && matchesAny(teamMemberIds, ownerId, createdBy)) {
            return true;
        }
        return canUseTerritoryScope(currentUser, AccessMode.READ) && territoryMatches(currentUser.getTerritory(), territory);
    }

    private boolean canWrite(User currentUser, UUID ownerId, UUID createdBy, String territory) {
        if (hasScope(currentUser, DataAccessScope.TENANT)) {
            return true;
        }
        if (matchesUserOrCreatedBy(currentUser.getId(), ownerId, createdBy)) {
            return true;
        }
        Set<UUID> teamMemberIds = managedUserIds(currentUser);
        if (hasScope(currentUser, DataAccessScope.TEAM) && matchesAny(teamMemberIds, ownerId, createdBy)) {
            return true;
        }
        return currentUser.getRole() == UserRole.MANAGER && territoryMatches(currentUser.getTerritory(), territory);
    }

    private boolean matchesUserOrCreatedBy(UUID currentUserId, UUID ownerId, UUID createdBy) {
        return currentUserId != null && (currentUserId.equals(ownerId) || currentUserId.equals(createdBy));
    }

    private boolean matchesAny(Set<UUID> candidateIds, UUID ownerId, UUID createdBy) {
        return candidateIds.contains(ownerId) || candidateIds.contains(createdBy);
    }

    private boolean territoryMatches(String actorTerritory, String recordTerritory) {
        String normalizedActorTerritory = normalizeTerritory(actorTerritory);
        String normalizedRecordTerritory = normalizeTerritory(recordTerritory);
        return normalizedActorTerritory != null && normalizedActorTerritory.equals(normalizedRecordTerritory);
    }

    private String normalizeTerritory(String territory) {
        if (territory == null) {
            return null;
        }
        String normalized = territory.trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private boolean canUseTerritoryScope(User currentUser, AccessMode accessMode) {
        return hasScope(currentUser, DataAccessScope.TERRITORY)
                && (accessMode == AccessMode.READ || currentUser.getRole() == UserRole.MANAGER);
    }

    private boolean hasScope(User currentUser, DataAccessScope scope) {
        return RolePermissionRegistry.dataScopesFor(currentUser.getRole()).contains(scope);
    }

    private void assertReadable(Supplier<Boolean> check, String resourceName) {
        if (!Boolean.TRUE.equals(check.get())) {
            throw new AccessDeniedException("You do not have permission to access this " + resourceName);
        }
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new AccessDeniedException("Tenant context is required");
        }
        return tenantId;
    }

    private enum AccessMode {
        READ,
        WRITE
    }
}
