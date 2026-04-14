package com.crm.entity;

import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.AutomationExecutionMode;
import com.crm.entity.enums.AutomationModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "automation_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRule extends AbstractEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "module", nullable = false, length = 40)
    private AutomationModule module;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 60)
    private AutomationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", nullable = false, length = 40)
    private AutomationExecutionMode executionMode;

    @Column(name = "conditions_json", nullable = false, columnDefinition = "TEXT")
    private String conditionsJson;

    @Column(name = "actions_json", nullable = false, columnDefinition = "TEXT")
    private String actionsJson;

    @Column(name = "priority_order", nullable = false)
    private Integer priorityOrder;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
