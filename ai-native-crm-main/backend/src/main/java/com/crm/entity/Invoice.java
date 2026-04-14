package com.crm.entity;

import com.crm.entity.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "invoices", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "invoice_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice extends AbstractEntity {

    @Column(name = "invoice_number", nullable = false, length = 50)
    private String invoiceNumber;

    @Column(name = "customer_name")
    private String customerName;

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

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "payment_terms", length = 100)
    private String paymentTerms;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 19, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InvoiceLineItem> items = new ArrayList<>();

    @Transient
    public int getItemsCount() {
        return items != null ? items.size() : 0;
    }

    @Transient
    public BigDecimal getAmountDue() {
        return total.subtract(amountPaid != null ? amountPaid : BigDecimal.ZERO);
    }

    public void calculateTotals() {
        if (items != null && !items.isEmpty()) {
            this.subtotal = items.stream()
                    .map(InvoiceLineItem::getTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            this.subtotal = BigDecimal.ZERO;
        }
        this.total = this.subtotal.add(this.tax != null ? this.tax : BigDecimal.ZERO);
    }
}
