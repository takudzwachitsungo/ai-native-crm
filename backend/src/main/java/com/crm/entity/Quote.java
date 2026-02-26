package com.crm.entity;

import com.crm.entity.enums.QuoteStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quotes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "quote_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quote extends AbstractEntity {

    @Column(name = "quote_number", nullable = false, length = 50)
    private String quoteNumber;

    private String title;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private QuoteStatus status = QuoteStatus.DRAFT;

    @Column(name = "payment_terms", length = 100)
    private String paymentTerms;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<QuoteLineItem> items = new ArrayList<>();

    @Transient
    public int getItemsCount() {
        return items != null ? items.size() : 0;
    }

    public void calculateTotals() {
        if (items != null && !items.isEmpty()) {
            this.subtotal = items.stream()
                    .map(QuoteLineItem::getTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            this.subtotal = BigDecimal.ZERO;
        }
        this.total = this.subtotal.subtract(this.discount != null ? this.discount : BigDecimal.ZERO);
    }
}
