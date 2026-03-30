package com.crm.entity;

import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.InfluenceLevel;
import com.crm.entity.enums.PreferredContactMethod;
import com.crm.entity.enums.StakeholderRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contacts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contact extends AbstractEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    private String email;

    @Column(length = 50)
    private String phone;

    @Column(length = 50)
    private String mobile;

    private String title;

    @Column(length = 100)
    private String department;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "stakeholder_role", length = 50)
    private StakeholderRole stakeholderRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "influence_level", length = 20)
    private InfluenceLevel influenceLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_contact_method", length = 20)
    private PreferredContactMethod preferredContactMethod;

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

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "twitter_url", length = 500)
    private String twitterUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ContactStatus status = ContactStatus.ACTIVE;

    @Column(name = "last_contact_date")
    private LocalDateTime lastContactDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "reports_to_id")
    private UUID reportsToId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reports_to_id", insertable = false, updatable = false)
    private Contact reportsTo;

    public String getFullName() {
        return firstName + " " + lastName;
    }

    @Transient
    public String getCompanyName() {
        return company != null ? company.getName() : null;
    }

    @Transient
    public String getReportsToName() {
        return reportsTo != null ? reportsTo.getFullName() : null;
    }
}
