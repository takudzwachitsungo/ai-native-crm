package com.crm.entity;

import com.crm.entity.enums.ContractStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contracts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenant_id", "contract_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract extends AbstractEntity {

    @Column(name = "contract_number", nullable = false, length = 50)
    private String contractNumber;

    @Column(length = 200)
    private String title;

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

    @Column(name = "quote_id")
    private UUID quoteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_id", insertable = false, updatable = false)
    private Quote quote;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Column(length = 120)
    private String territory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ContractStatus status = ContractStatus.DRAFT;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "renewal_date")
    private LocalDate renewalDate;

    @Column(name = "auto_renew", nullable = false)
    private Boolean autoRenew = false;

    @Column(name = "renewal_notice_days", nullable = false)
    private Integer renewalNoticeDays = 30;

    @Column(name = "contract_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal contractValue = BigDecimal.ZERO;

    @Column(name = "renewal_invoice_id")
    private UUID renewalInvoiceId;

    @Column(name = "renewal_invoice_generated_at")
    private LocalDateTime renewalInvoiceGeneratedAt;

    @Column(name = "renewed_from_contract_id")
    private UUID renewedFromContractId;

    @Column(name = "renewed_to_contract_id")
    private UUID renewedToContractId;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "terminated_at")
    private LocalDateTime terminatedAt;

    @Column(name = "termination_reason", columnDefinition = "TEXT")
    private String terminationReason;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
