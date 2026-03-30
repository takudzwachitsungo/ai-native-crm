package com.crm.repository;

import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.WorkflowRuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, UUID> {

    Optional<WorkflowRule> findByTenantIdAndRuleTypeAndArchivedFalse(UUID tenantId, WorkflowRuleType ruleType);
}
