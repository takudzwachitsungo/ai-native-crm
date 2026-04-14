package com.crm.service.impl;

import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import com.crm.service.CustomerDataGovernancePolicy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CustomerDataGovernancePolicyImpl implements CustomerDataGovernancePolicy {

    @Override
    public void applyLeadGovernance(Lead lead, LeadRequestDTO request) {
        lead.setMarketingConsent(Boolean.TRUE.equals(lead.getMarketingConsent()));
        if (Boolean.TRUE.equals(lead.getMarketingConsent()) && lead.getConsentCapturedAt() == null) {
            lead.setConsentCapturedAt(LocalDateTime.now());
        }
        if (!Boolean.TRUE.equals(lead.getMarketingConsent())) {
            lead.setConsentCapturedAt(null);
            lead.setConsentSource(null);
        }
        if (lead.getPrivacyStatus() == null) {
            lead.setPrivacyStatus(CustomerPrivacyStatus.ACTIVE);
        }
        if (request == null || request.getDataQualityScore() == null) {
            lead.setDataQualityScore(clamp(calculateLeadQualityScore(lead)));
        } else {
            lead.setDataQualityScore(clamp(lead.getDataQualityScore()));
        }
        if (lead.getEnrichmentStatus() == null) {
            lead.setEnrichmentStatus(DataEnrichmentStatus.NOT_ENRICHED);
        }
        if (lead.getEnrichmentStatus() != DataEnrichmentStatus.NOT_ENRICHED && lead.getEnrichmentLastCheckedAt() == null) {
            lead.setEnrichmentLastCheckedAt(LocalDateTime.now());
        }
    }

    @Override
    public void applyContactGovernance(Contact contact, ContactRequestDTO request) {
        contact.setMarketingConsent(Boolean.TRUE.equals(contact.getMarketingConsent()));
        if (Boolean.TRUE.equals(contact.getMarketingConsent()) && contact.getConsentCapturedAt() == null) {
            contact.setConsentCapturedAt(LocalDateTime.now());
        }
        if (!Boolean.TRUE.equals(contact.getMarketingConsent())) {
            contact.setConsentCapturedAt(null);
            contact.setConsentSource(null);
        }
        if (contact.getPrivacyStatus() == null) {
            contact.setPrivacyStatus(CustomerPrivacyStatus.ACTIVE);
        }
        if (request == null || request.getDataQualityScore() == null) {
            contact.setDataQualityScore(clamp(calculateContactQualityScore(contact)));
        } else {
            contact.setDataQualityScore(clamp(contact.getDataQualityScore()));
        }
        if (contact.getEnrichmentStatus() == null) {
            contact.setEnrichmentStatus(DataEnrichmentStatus.NOT_ENRICHED);
        }
        if (contact.getEnrichmentStatus() != DataEnrichmentStatus.NOT_ENRICHED && contact.getEnrichmentLastCheckedAt() == null) {
            contact.setEnrichmentLastCheckedAt(LocalDateTime.now());
        }
    }

    @Override
    public void applyCompanyGovernance(Company company, CompanyRequestDTO request) {
        if (company.getPrivacyStatus() == null) {
            company.setPrivacyStatus(CustomerPrivacyStatus.ACTIVE);
        }
        if (request == null || request.getDataQualityScore() == null) {
            company.setDataQualityScore(clamp(calculateCompanyQualityScore(company)));
        } else {
            company.setDataQualityScore(clamp(company.getDataQualityScore()));
        }
        if (company.getEnrichmentStatus() == null) {
            company.setEnrichmentStatus(DataEnrichmentStatus.NOT_ENRICHED);
        }
        if (company.getEnrichmentStatus() != DataEnrichmentStatus.NOT_ENRICHED && company.getEnrichmentLastCheckedAt() == null) {
            company.setEnrichmentLastCheckedAt(LocalDateTime.now());
        }
    }

    @Override
    public CustomerPrivacyStatus moreRestrictive(CustomerPrivacyStatus first, CustomerPrivacyStatus second) {
        return privacyRank(first) >= privacyRank(second) ? normalizePrivacy(first) : normalizePrivacy(second);
    }

    private int calculateLeadQualityScore(Lead lead) {
        int score = 20;
        score += hasText(lead.getEmail()) ? 20 : 0;
        score += hasText(lead.getPhone()) ? 15 : 0;
        score += hasText(lead.getCompany()) ? 15 : 0;
        score += hasText(lead.getTitle()) ? 10 : 0;
        score += lead.getSource() != null ? 8 : 0;
        score += lead.getEstimatedValue() != null ? 7 : 0;
        score += hasText(lead.getTerritory()) ? 5 : 0;
        return score;
    }

    private int calculateContactQualityScore(Contact contact) {
        int score = 25;
        score += hasText(contact.getEmail()) ? 18 : 0;
        score += hasText(contact.getPhone()) || hasText(contact.getMobile()) ? 15 : 0;
        score += hasText(contact.getTitle()) ? 10 : 0;
        score += contact.getCompanyId() != null ? 12 : 0;
        score += contact.getPreferredContactMethod() != null ? 6 : 0;
        score += hasText(contact.getLinkedinUrl()) ? 8 : 0;
        score += hasText(contact.getCountry()) ? 6 : 0;
        return score;
    }

    private int calculateCompanyQualityScore(Company company) {
        int score = 25;
        score += hasText(company.getEmail()) ? 15 : 0;
        score += hasText(company.getPhone()) ? 10 : 0;
        score += hasText(company.getWebsite()) ? 15 : 0;
        score += company.getIndustry() != null ? 10 : 0;
        score += hasText(company.getTerritory()) ? 10 : 0;
        score += company.getOwnerId() != null ? 8 : 0;
        score += hasText(company.getCountry()) ? 7 : 0;
        return score;
    }

    private int clamp(Integer value) {
        if (value == null) {
            return 0;
        }
        return Math.max(0, Math.min(100, value));
    }

    private int privacyRank(CustomerPrivacyStatus status) {
        return switch (normalizePrivacy(status)) {
            case ACTIVE -> 0;
            case RESTRICTED -> 1;
            case SUPPRESSED -> 2;
            case ERASURE_REQUESTED -> 3;
        };
    }

    private CustomerPrivacyStatus normalizePrivacy(CustomerPrivacyStatus status) {
        return status == null ? CustomerPrivacyStatus.ACTIVE : status;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
