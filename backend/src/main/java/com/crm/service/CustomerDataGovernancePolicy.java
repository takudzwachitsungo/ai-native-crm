package com.crm.service;

import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.enums.CustomerPrivacyStatus;

public interface CustomerDataGovernancePolicy {

    void applyLeadGovernance(Lead lead, LeadRequestDTO request);

    void applyContactGovernance(Contact contact, ContactRequestDTO request);

    void applyCompanyGovernance(Company company, CompanyRequestDTO request);

    CustomerPrivacyStatus moreRestrictive(CustomerPrivacyStatus first, CustomerPrivacyStatus second);
}
