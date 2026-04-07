package com.crm.repository;

import com.crm.entity.AutomationRule;
import com.crm.entity.enums.AutomationEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, UUID> {

    List<AutomationRule> findByTenantIdAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(UUID tenantId);

    List<AutomationRule> findByTenantIdAndEventTypeAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(
            UUID tenantId,
            AutomationEventType eventType
    );

    List<AutomationRule> findByTenantIdAndEventTypeAndIsActiveTrueAndArchivedFalseOrderByPriorityOrderAscCreatedAtAsc(
            UUID tenantId,
            AutomationEventType eventType
    );

    Optional<AutomationRule> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);
}
