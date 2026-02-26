package com.crm.entity;

import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.DealType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "deals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deal extends AbstractEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @Column(name = "contact_id")
    private UUID contactId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", insertable = false, updatable = false)
    private Contact contact;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DealStage stage = DealStage.PROSPECTING;

    @Column(columnDefinition = "INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100)")
    private Integer probability = 0;

    @Column(name = "expected_close_date")
    private LocalDate expectedCloseDate;

    @Column(name = "actual_close_date")
    private LocalDate actualCloseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "deal_type", length = 50)
    private DealType dealType;

    @Column(name = "lead_source", length = 50)
    private String leadSource;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Transient
    public String getCompanyName() {
        return company != null ? company.getName() : null;
    }

    @Transient
    public String getContactName() {
        return contact != null ? contact.getFullName() : null;
    }

    @Transient
    public BigDecimal getWeightedValue() {
        if (value == null || probability == null) {
            return BigDecimal.ZERO;
        }
        return value.multiply(BigDecimal.valueOf(probability)).divide(BigDecimal.valueOf(100));
    }
}
