package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.CustomerDataGovernanceSummaryDTO;
import com.crm.dto.response.CustomerDuplicateCandidateDTO;
import com.crm.dto.response.CustomerDuplicateRecordDTO;
import com.crm.dto.response.CustomerRecordMergeResultDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.ContractRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.InvoiceRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.QuoteRepository;
import com.crm.repository.SupportCaseRepository;
import com.crm.repository.TaskRepository;
import com.crm.service.CustomerDataGovernancePolicy;
import com.crm.service.CustomerDataGovernanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerDataGovernanceServiceImpl implements CustomerDataGovernanceService {

    private final LeadRepository leadRepository;
    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final DealRepository dealRepository;
    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final ContractRepository contractRepository;
    private final SupportCaseRepository supportCaseRepository;
    private final TaskRepository taskRepository;
    private final CustomerDataGovernancePolicy governancePolicy;

    @Override
    @Transactional(readOnly = true)
    public CustomerDataGovernanceSummaryDTO getSummary() {
        UUID tenantId = TenantContext.getTenantId();
        List<Lead> leads = leadRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        List<Contact> contacts = contactRepository.findByTenantIdAndArchivedFalse(tenantId);
        List<Company> companies = companyRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        List<CustomerDuplicateCandidateDTO> duplicates = buildDuplicateCandidates(leads, contacts, companies);

        return CustomerDataGovernanceSummaryDTO.builder()
                .totalLeads((long) leads.size())
                .totalContacts((long) contacts.size())
                .totalCompanies((long) companies.size())
                .recordsWithoutConsent(countMissingConsent(leads, contacts))
                .suppressedRecords(countSuppressed(leads, contacts, companies))
                .recordsNeedingEnrichment(countNeedsEnrichment(leads, contacts, companies))
                .duplicateCandidateCount((long) duplicates.size())
                .averageLeadQualityScore(average(leads.stream().map(Lead::getDataQualityScore).toList()))
                .averageContactQualityScore(average(contacts.stream().map(Contact::getDataQualityScore).toList()))
                .averageCompanyQualityScore(average(companies.stream().map(Company::getDataQualityScore).toList()))
                .topDuplicateCandidates(duplicates.stream().limit(10).toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerDuplicateCandidateDTO> getDuplicateCandidates() {
        UUID tenantId = TenantContext.getTenantId();
        return buildDuplicateCandidates(
                leadRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent(),
                contactRepository.findByTenantIdAndArchivedFalse(tenantId),
                companyRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent()
        );
    }

    @Override
    @Transactional
    @CacheEvict(value = {"contacts", "dashboard-metrics", "companies"}, allEntries = true)
    public CustomerRecordMergeResultDTO mergeContacts(UUID targetContactId, UUID sourceContactId) {
        UUID tenantId = TenantContext.getTenantId();
        if (targetContactId.equals(sourceContactId)) {
            throw new BadRequestException("Target and source contacts must be different");
        }

        Contact target = contactRepository.findById(targetContactId)
                .filter(contact -> tenantId.equals(contact.getTenantId()) && !Boolean.TRUE.equals(contact.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Contact", targetContactId));
        Contact source = contactRepository.findById(sourceContactId)
                .filter(contact -> tenantId.equals(contact.getTenantId()) && !Boolean.TRUE.equals(contact.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Contact", sourceContactId));

        mergeContactFields(target, source);
        target = contactRepository.save(target);

        int movedDeals = dealRepository.reassignContact(tenantId, sourceContactId, targetContactId);
        int movedQuotes = quoteRepository.reassignContact(tenantId, sourceContactId, targetContactId);
        int movedInvoices = invoiceRepository.reassignContact(tenantId, sourceContactId, targetContactId);
        int movedContracts = contractRepository.reassignContact(tenantId, sourceContactId, targetContactId);
        int movedCases = supportCaseRepository.reassignContact(tenantId, sourceContactId, targetContactId);
        int movedTasks = taskRepository.reassignRelatedEntity(tenantId, "contact", sourceContactId, targetContactId);
        int updatedReportsToContacts = contactRepository.reassignReportsTo(tenantId, sourceContactId, targetContactId);

        source.setArchived(Boolean.TRUE);
        source.setNotes(mergeNotes(source.getNotes(), "Merged into contact " + target.getFullName() + " on " + LocalDateTime.now() + "."));
        source.setReportsToId(null);
        source.setReportsTo(null);
        contactRepository.save(source);

        log.info("Merged duplicate contact {} into {} for tenant {}", sourceContactId, targetContactId, tenantId);

        return CustomerRecordMergeResultDTO.builder()
                .targetContactId(targetContactId)
                .archivedSourceContactId(sourceContactId)
                .movedDeals(movedDeals)
                .movedQuotes(movedQuotes)
                .movedInvoices(movedInvoices)
                .movedContracts(movedContracts)
                .movedCases(movedCases)
                .movedTasks(movedTasks)
                .updatedReportsToContacts(updatedReportsToContacts)
                .detail("Merged duplicate contact and rewired downstream revenue, service, and task references.")
                .build();
    }

    private void mergeContactFields(Contact target, Contact source) {
        if (!hasText(target.getFirstName()) && hasText(source.getFirstName())) {
            target.setFirstName(source.getFirstName());
        }
        if (!hasText(target.getLastName()) && hasText(source.getLastName())) {
            target.setLastName(source.getLastName());
        }
        if (!hasText(target.getEmail()) && hasText(source.getEmail())) {
            target.setEmail(source.getEmail());
        }
        if (!hasText(target.getPhone()) && hasText(source.getPhone())) {
            target.setPhone(source.getPhone());
        }
        if (!hasText(target.getMobile()) && hasText(source.getMobile())) {
            target.setMobile(source.getMobile());
        }
        if (!hasText(target.getTitle()) && hasText(source.getTitle())) {
            target.setTitle(source.getTitle());
        }
        if (!hasText(target.getDepartment()) && hasText(source.getDepartment())) {
            target.setDepartment(source.getDepartment());
        }
        if (!hasText(target.getAddress()) && hasText(source.getAddress())) {
            target.setAddress(source.getAddress());
        }
        if (!hasText(target.getCity()) && hasText(source.getCity())) {
            target.setCity(source.getCity());
        }
        if (!hasText(target.getState()) && hasText(source.getState())) {
            target.setState(source.getState());
        }
        if (!hasText(target.getPostalCode()) && hasText(source.getPostalCode())) {
            target.setPostalCode(source.getPostalCode());
        }
        if (!hasText(target.getCountry()) && hasText(source.getCountry())) {
            target.setCountry(source.getCountry());
        }
        if (!hasText(target.getLinkedinUrl()) && hasText(source.getLinkedinUrl())) {
            target.setLinkedinUrl(source.getLinkedinUrl());
        }
        if (!hasText(target.getTwitterUrl()) && hasText(source.getTwitterUrl())) {
            target.setTwitterUrl(source.getTwitterUrl());
        }
        if (target.getCompanyId() == null && source.getCompanyId() != null) {
            target.setCompanyId(source.getCompanyId());
            target.setCompany(source.getCompany());
        }
        if (target.getReportsToId() == null && source.getReportsToId() != null && !source.getReportsToId().equals(target.getId())) {
            target.setReportsToId(source.getReportsToId());
            target.setReportsTo(source.getReportsTo());
        }
        if (target.getReportsToId() != null && target.getReportsToId().equals(source.getId())) {
            target.setReportsToId(source.getReportsToId() != null && !source.getReportsToId().equals(target.getId()) ? source.getReportsToId() : null);
            target.setReportsTo(null);
        }

        target.setIsPrimary(Boolean.TRUE.equals(target.getIsPrimary()) || Boolean.TRUE.equals(source.getIsPrimary()));
        if (target.getStakeholderRole() == null) {
            target.setStakeholderRole(source.getStakeholderRole());
        }
        if (target.getInfluenceLevel() == null) {
            target.setInfluenceLevel(source.getInfluenceLevel());
        }
        if (target.getPreferredContactMethod() == null) {
            target.setPreferredContactMethod(source.getPreferredContactMethod());
        }
        if (target.getLastContactDate() == null || (source.getLastContactDate() != null && source.getLastContactDate().isAfter(target.getLastContactDate()))) {
            target.setLastContactDate(source.getLastContactDate());
        }

        target.setMarketingConsent(Boolean.TRUE.equals(target.getMarketingConsent()) || Boolean.TRUE.equals(source.getMarketingConsent()));
        target.setConsentCapturedAt(earliest(target.getConsentCapturedAt(), source.getConsentCapturedAt()));
        if (!hasText(target.getConsentSource()) && hasText(source.getConsentSource())) {
            target.setConsentSource(source.getConsentSource());
        }
        target.setPrivacyStatus(governancePolicy.moreRestrictive(target.getPrivacyStatus(), source.getPrivacyStatus()));
        target.setDataQualityScore(Math.max(zeroSafe(target.getDataQualityScore()), zeroSafe(source.getDataQualityScore())));
        target.setEnrichmentStatus(mergeEnrichmentStatus(target.getEnrichmentStatus(), source.getEnrichmentStatus()));
        target.setEnrichmentLastCheckedAt(latest(target.getEnrichmentLastCheckedAt(), source.getEnrichmentLastCheckedAt()));
        target.setNotes(mergeNotes(target.getNotes(), source.getNotes()));

        governancePolicy.applyContactGovernance(target, null);
    }

    private List<CustomerDuplicateCandidateDTO> buildDuplicateCandidates(
            List<Lead> leads,
            List<Contact> contacts,
            List<Company> companies
    ) {
        List<CustomerDuplicateCandidateDTO> duplicates = new ArrayList<>();
        duplicates.addAll(groupDuplicates(
                leads,
                lead -> normalizeKey(lead.getEmail()),
                "LEAD",
                "EMAIL",
                lead -> CustomerDuplicateRecordDTO.builder()
                        .id(lead.getId())
                        .recordType("LEAD")
                        .displayName(lead.getFullName())
                        .email(lead.getEmail())
                        .phone(lead.getPhone())
                        .companyName(lead.getCompany())
                        .privacyStatus(lead.getPrivacyStatus())
                        .dataQualityScore(lead.getDataQualityScore())
                        .enrichmentStatus(lead.getEnrichmentStatus())
                        .build()
        ));
        duplicates.addAll(groupDuplicates(
                contacts,
                contact -> normalizeKey(contact.getEmail()),
                "CONTACT",
                "EMAIL",
                contact -> CustomerDuplicateRecordDTO.builder()
                        .id(contact.getId())
                        .recordType("CONTACT")
                        .displayName(contact.getFullName())
                        .email(contact.getEmail())
                        .phone(firstPresent(contact.getPhone(), contact.getMobile()))
                        .companyName(contact.getCompanyName())
                        .privacyStatus(contact.getPrivacyStatus())
                        .dataQualityScore(contact.getDataQualityScore())
                        .enrichmentStatus(contact.getEnrichmentStatus())
                        .build()
        ));
        duplicates.addAll(groupDuplicates(
                companies,
                company -> normalizeKey(company.getName()),
                "COMPANY",
                "NAME",
                company -> CustomerDuplicateRecordDTO.builder()
                        .id(company.getId())
                        .recordType("COMPANY")
                        .displayName(company.getName())
                        .email(company.getEmail())
                        .phone(company.getPhone())
                        .companyName(company.getName())
                        .privacyStatus(company.getPrivacyStatus())
                        .dataQualityScore(company.getDataQualityScore())
                        .enrichmentStatus(company.getEnrichmentStatus())
                        .build()
        ));

        return duplicates.stream()
                .sorted(Comparator
                        .comparing(CustomerDuplicateCandidateDTO::getRecordCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(CustomerDuplicateCandidateDTO::getRecordType)
                        .thenComparing(CustomerDuplicateCandidateDTO::getDuplicateKey))
                .toList();
    }

    private <T> List<CustomerDuplicateCandidateDTO> groupDuplicates(
            List<T> records,
            Function<T, String> keyExtractor,
            String recordType,
            String matchType,
            Function<T, CustomerDuplicateRecordDTO> mapper
    ) {
        Map<String, List<T>> groups = records.stream()
                .filter(Objects::nonNull)
                .filter(record -> hasText(keyExtractor.apply(record)))
                .collect(Collectors.groupingBy(keyExtractor, LinkedHashMap::new, Collectors.toList()));

        return groups.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .map(entry -> CustomerDuplicateCandidateDTO.builder()
                        .recordType(recordType)
                        .matchType(matchType)
                        .duplicateKey(entry.getKey())
                        .recordCount((long) entry.getValue().size())
                        .recommendedAction("Review and merge duplicate " + recordType.toLowerCase(Locale.ROOT) + " records sharing the same " + matchType.toLowerCase(Locale.ROOT) + ".")
                        .records(entry.getValue().stream()
                                .map(mapper)
                                .sorted(Comparator.comparing(CustomerDuplicateRecordDTO::getDataQualityScore, Comparator.nullsLast(Comparator.reverseOrder())))
                                .toList())
                        .build())
                .toList();
    }

    private long countMissingConsent(List<Lead> leads, List<Contact> contacts) {
        return leads.stream().filter(lead -> !Boolean.TRUE.equals(lead.getMarketingConsent())).count()
                + contacts.stream().filter(contact -> !Boolean.TRUE.equals(contact.getMarketingConsent())).count();
    }

    private long countSuppressed(List<Lead> leads, List<Contact> contacts, List<Company> companies) {
        return leads.stream().filter(lead -> lead.getPrivacyStatus() != CustomerPrivacyStatus.ACTIVE).count()
                + contacts.stream().filter(contact -> contact.getPrivacyStatus() != CustomerPrivacyStatus.ACTIVE).count()
                + companies.stream().filter(company -> company.getPrivacyStatus() != CustomerPrivacyStatus.ACTIVE).count();
    }

    private long countNeedsEnrichment(List<Lead> leads, List<Contact> contacts, List<Company> companies) {
        return leads.stream().filter(lead -> lead.getEnrichmentStatus() != DataEnrichmentStatus.ENRICHED).count()
                + contacts.stream().filter(contact -> contact.getEnrichmentStatus() != DataEnrichmentStatus.ENRICHED).count()
                + companies.stream().filter(company -> company.getEnrichmentStatus() != DataEnrichmentStatus.ENRICHED).count();
    }

    private Double average(List<Integer> values) {
        return values.stream()
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);
    }

    private String mergeNotes(String base, String incoming) {
        if (!hasText(base)) {
            return hasText(incoming) ? incoming.trim() : null;
        }
        if (!hasText(incoming)) {
            return base.trim();
        }
        if (base.contains(incoming)) {
            return base.trim();
        }
        return (base.trim() + "\n\n" + incoming.trim()).trim();
    }

    private DataEnrichmentStatus mergeEnrichmentStatus(DataEnrichmentStatus first, DataEnrichmentStatus second) {
        if (first == DataEnrichmentStatus.NEEDS_REVIEW || second == DataEnrichmentStatus.NEEDS_REVIEW) {
            return DataEnrichmentStatus.NEEDS_REVIEW;
        }
        if (first == DataEnrichmentStatus.ENRICHED || second == DataEnrichmentStatus.ENRICHED) {
            return DataEnrichmentStatus.ENRICHED;
        }
        return DataEnrichmentStatus.NOT_ENRICHED;
    }

    private LocalDateTime earliest(LocalDateTime first, LocalDateTime second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return first.isBefore(second) ? first : second;
    }

    private LocalDateTime latest(LocalDateTime first, LocalDateTime second) {
        if (first == null) {
            return second;
        }
        if (second == null) {
            return first;
        }
        return first.isAfter(second) ? first : second;
    }

    private Integer zeroSafe(Integer value) {
        return value == null ? 0 : value;
    }

    private String normalizeKey(String value) {
        return hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private String firstPresent(String first, String second) {
        return hasText(first) ? first : second;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
