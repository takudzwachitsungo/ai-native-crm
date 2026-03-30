package com.crm.entity;

import com.crm.entity.enums.CompanyStatus;
import com.crm.entity.enums.Industry;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company extends AbstractEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(length = 100)
    private Industry industry;

    @Column(length = 500)
    private String website;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false)
    private String email;

    @Column(length = 50)
    private String revenue;

    @Column(name = "employee_count", length = 50)
    private String employeeCount;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(length = 100)
    private String country = "United States";

    @Column(length = 120)
    private String territory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CompanyStatus status = CompanyStatus.ACTIVE;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "parent_company_id")
    private UUID parentCompanyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_company_id", insertable = false, updatable = false)
    private Company parentCompany;

    @OneToMany(mappedBy = "parentCompany", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Company> childCompanies = new ArrayList<>();

    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Contact> contacts = new ArrayList<>();

    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Deal> deals = new ArrayList<>();

    @Transient
    public int getContactsCount() {
        return contacts != null ? contacts.size() : 0;
    }

    @Transient
    public int getDealsCount() {
        return deals != null ? deals.size() : 0;
    }

    @Transient
    public String getParentCompanyName() {
        return parentCompany != null ? parentCompany.getName() : null;
    }
}
