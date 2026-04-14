package com.crm.entity;

import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import com.crm.entity.enums.WorkOrderType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "work_orders", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenant_id", "order_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder extends AbstractEntity {

    @Column(name = "order_number", nullable = false, length = 50)
    private String orderNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkOrderStatus status = WorkOrderStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkOrderPriority priority = WorkOrderPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_type", nullable = false, length = 30)
    private WorkOrderType workType = WorkOrderType.OTHER;

    @Column(name = "company_id")
    private UUID companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @Column(name = "contact_id")
    private UUID contactId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", insertable = false, updatable = false)
    private Contact contact;

    @Column(name = "support_case_id")
    private UUID supportCaseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_case_id", insertable = false, updatable = false)
    private SupportCase supportCase;

    @Column(name = "assigned_technician_id")
    private UUID assignedTechnicianId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_technician_id", insertable = false, updatable = false)
    private User assignedTechnician;

    @Column(length = 120)
    private String territory;

    @Column(name = "service_address", length = 255)
    private String serviceAddress;

    @Column(name = "scheduled_start_at")
    private LocalDateTime scheduledStartAt;

    @Column(name = "scheduled_end_at")
    private LocalDateTime scheduledEndAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "completion_notes", columnDefinition = "TEXT")
    private String completionNotes;
}
