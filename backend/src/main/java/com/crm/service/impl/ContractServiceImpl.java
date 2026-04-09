package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.ContractFilterDTO;
import com.crm.dto.request.ContractRequestDTO;
import com.crm.dto.request.QuoteToContractRequestDTO;
import com.crm.dto.response.ContractResponseDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Contract;
import com.crm.entity.Invoice;
import com.crm.entity.InvoiceLineItem;
import com.crm.entity.Quote;
import com.crm.entity.QuoteLineItem;
import com.crm.entity.User;
import com.crm.entity.enums.ContractStatus;
import com.crm.entity.enums.InvoiceStatus;
import com.crm.entity.enums.QuoteStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.ContractRepository;
import com.crm.repository.InvoiceRepository;
import com.crm.repository.QuoteRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.ContractService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContractServiceImpl implements ContractService {

    private final ContractRepository contractRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final RecordAccessService recordAccessService;

    @Override
    @Transactional(readOnly = true)
    public Page<ContractResponseDTO> findAll(Pageable pageable, ContractFilterDTO filter) {
        UUID tenantId = requireTenantId();

        List<Specification<Contract>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Contract> accessScope = recordAccessService.contractReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }

        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase().trim() + "%";
                specs.add((root, query, cb) -> cb.or(
                        cb.like(cb.lower(root.get("contractNumber")), search),
                        cb.like(cb.lower(root.get("title")), search),
                        cb.like(cb.lower(root.get("notes")), search)
                ));
            }
            specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            specs.add(SpecificationBuilder.equal("companyId", filter.getCompanyId()));
            specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            specs.add(SpecificationBuilder.equal("quoteId", filter.getQuoteId()));
            specs.add(SpecificationBuilder.dateBetween("startDate", filter.getStartDateFrom(), filter.getStartDateTo()));
            specs.add(SpecificationBuilder.dateBetween("endDate", filter.getEndDateFrom(), filter.getEndDateTo()));
        }

        Specification<Contract> spec = SpecificationBuilder.combineWithAnd(specs);
        return contractRepository.findAll(spec, pageable).map(this::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public ContractResponseDTO findById(UUID id) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanViewContract(contract);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO create(ContractRequestDTO request) {
        UUID tenantId = requireTenantId();
        validateContractNumberUnique(tenantId, request.getContractNumber(), null);
        validateContractDates(request.getStartDate(), request.getEndDate());

        Company company = resolveCompany(request.getCompanyId(), tenantId);
        Contact contact = resolveContact(request.getContactId(), tenantId);
        Quote quote = resolveQuote(request.getQuoteId(), tenantId);
        UUID ownerId = resolveOwnerId(request.getOwnerId(), quote);

        Contract contract = Contract.builder()
                .contractNumber(request.getContractNumber())
                .title(request.getTitle())
                .companyId(company.getId())
                .company(company)
                .contactId(contact != null ? contact.getId() : null)
                .contact(contact)
                .quoteId(quote != null ? quote.getId() : null)
                .quote(quote)
                .ownerId(ownerId)
                .owner(resolveOwner(ownerId, tenantId))
                .territory(company.getTerritory())
                .status(request.getStatus() != null ? request.getStatus() : ContractStatus.DRAFT)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .autoRenew(Boolean.TRUE.equals(request.getAutoRenew()))
                .renewalNoticeDays(normalizeRenewalNoticeDays(request.getRenewalNoticeDays()))
                .contractValue(defaultMoney(request.getContractValue()))
                .terminationReason(request.getTerminationReason())
                .notes(request.getNotes())
                .build();
        contract.setTenantId(tenantId);

        applyLifecycleDefaults(contract);
        contract = contractRepository.save(contract);
        log.info("Created contract {} for tenant {}", contract.getId(), tenantId);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO update(UUID id, ContractRequestDTO request) {
        UUID tenantId = requireTenantId();
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);

        validateContractNumberUnique(tenantId, request.getContractNumber(), contract.getId());
        validateContractDates(request.getStartDate(), request.getEndDate());

        Company company = resolveCompany(request.getCompanyId(), tenantId);
        Contact contact = resolveContact(request.getContactId(), tenantId);
        Quote quote = resolveQuote(request.getQuoteId(), tenantId);
        UUID ownerId = resolveOwnerId(request.getOwnerId(), quote);

        contract.setContractNumber(request.getContractNumber());
        contract.setTitle(request.getTitle());
        contract.setCompanyId(company.getId());
        contract.setCompany(company);
        contract.setContactId(contact != null ? contact.getId() : null);
        contract.setContact(contact);
        contract.setQuoteId(quote != null ? quote.getId() : null);
        contract.setQuote(quote);
        contract.setOwnerId(ownerId);
        contract.setOwner(resolveOwner(ownerId, tenantId));
        contract.setTerritory(company.getTerritory());
        contract.setStatus(request.getStatus() != null ? request.getStatus() : contract.getStatus());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        contract.setAutoRenew(Boolean.TRUE.equals(request.getAutoRenew()));
        contract.setRenewalNoticeDays(normalizeRenewalNoticeDays(request.getRenewalNoticeDays()));
        contract.setContractValue(defaultMoney(request.getContractValue()));
        contract.setTerminationReason(request.getTerminationReason());
        contract.setNotes(request.getNotes());

        applyLifecycleDefaults(contract);
        contract = contractRepository.save(contract);
        log.info("Updated contract {} for tenant {}", contract.getId(), tenantId);
        return toDto(contract);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);
        contract.setArchived(true);
        contractRepository.save(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO activate(UUID id) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);
        if (contract.getStatus() == ContractStatus.TERMINATED) {
            throw new BadRequestException("Terminated contracts cannot be reactivated");
        }
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setActivatedAt(LocalDateTime.now());
        contract.setTerminatedAt(null);
        contract = contractRepository.save(contract);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO markRenewalDue(UUID id) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);
        if (contract.getStatus() == ContractStatus.TERMINATED) {
            throw new BadRequestException("Terminated contracts cannot enter renewal");
        }
        contract.setStatus(ContractStatus.RENEWAL_DUE);
        contract = contractRepository.save(contract);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO generateRenewalInvoice(UUID id, String requestedInvoiceNumber) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);

        if (contract.getStatus() != ContractStatus.RENEWAL_DUE && contract.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Only active or renewal-due contracts can generate renewal invoices");
        }

        UUID tenantId = requireTenantId();
        if (contract.getRenewalInvoiceId() != null) {
            Invoice existingInvoice = invoiceRepository.findById(contract.getRenewalInvoiceId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElse(null);
            if (existingInvoice != null) {
                return toDto(contract);
            }
        }

        Invoice invoice = buildRenewalInvoice(contract, tenantId, requestedInvoiceNumber);
        invoice = invoiceRepository.save(invoice);
        List<InvoiceLineItem> items = buildRenewalInvoiceLineItems(invoice, contract);
        items.forEach(InvoiceLineItem::calculateTotal);
        invoice.getItems().addAll(items);
        invoice.calculateTotals();
        invoice = invoiceRepository.save(invoice);

        contract.setRenewalInvoiceId(invoice.getId());
        contract.setRenewalInvoiceGeneratedAt(LocalDateTime.now());
        if (contract.getStatus() == ContractStatus.ACTIVE) {
            contract.setStatus(ContractStatus.RENEWAL_DUE);
        }
        contract = contractRepository.save(contract);

        log.info("Generated renewal invoice {} for contract {} in tenant {}", invoice.getId(), contract.getId(), tenantId);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO renew(UUID id, String requestedContractNumber) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);

        if (contract.getStatus() != ContractStatus.RENEWAL_DUE) {
            throw new BadRequestException("Only renewal-due contracts can be renewed");
        }
        if (contract.getRenewedToContractId() != null) {
            throw new BadRequestException("This contract has already been renewed");
        }

        UUID tenantId = requireTenantId();
        String nextContractNumber = generateUniqueContractNumber(
                tenantId,
                requestedContractNumber != null && !requestedContractNumber.isBlank()
                        ? requestedContractNumber.trim()
                        : contract.getContractNumber() + "-R"
        );

        LocalDate nextStartDate = contract.getEndDate().plusDays(1);
        long termLengthDays = Math.max(1, ChronoUnit.DAYS.between(contract.getStartDate(), contract.getEndDate()) + 1);
        LocalDate nextEndDate = nextStartDate.plusDays(termLengthDays - 1);

        Contract renewedContract = Contract.builder()
                .contractNumber(nextContractNumber)
                .title(contract.getTitle())
                .companyId(contract.getCompanyId())
                .company(contract.getCompany())
                .contactId(contract.getContactId())
                .contact(contract.getContact())
                .quoteId(contract.getQuoteId())
                .quote(contract.getQuote())
                .ownerId(contract.getOwnerId())
                .owner(contract.getOwner())
                .territory(contract.getTerritory())
                .status(ContractStatus.ACTIVE)
                .startDate(nextStartDate)
                .endDate(nextEndDate)
                .autoRenew(Boolean.TRUE.equals(contract.getAutoRenew()))
                .renewalNoticeDays(normalizeRenewalNoticeDays(contract.getRenewalNoticeDays()))
                .contractValue(defaultMoney(contract.getContractValue()))
                .renewedFromContractId(contract.getId())
                .notes(buildRenewalNotes(contract))
                .build();
        renewedContract.setTenantId(tenantId);

        applyLifecycleDefaults(renewedContract);
        renewedContract = contractRepository.save(renewedContract);

        contract.setStatus(ContractStatus.EXPIRED);
        contract.setRenewedToContractId(renewedContract.getId());
        contract = contractRepository.save(contract);

        log.info("Renewed contract {} into {} for tenant {}", contract.getId(), renewedContract.getId(), tenantId);
        return toDto(renewedContract);
    }

    @Override
    @Transactional
    public ContractResponseDTO terminate(UUID id, String reason) {
        Contract contract = findActiveContract(id);
        recordAccessService.assertCanWriteContract(contract);
        contract.setStatus(ContractStatus.TERMINATED);
        contract.setTerminatedAt(LocalDateTime.now());
        contract.setTerminationReason(reason != null && !reason.isBlank() ? reason.trim() : contract.getTerminationReason());
        contract = contractRepository.save(contract);
        return toDto(contract);
    }

    @Override
    @Transactional
    public ContractResponseDTO convertFromQuote(UUID quoteId, QuoteToContractRequestDTO request) {
        UUID tenantId = requireTenantId();
        validateContractNumberUnique(tenantId, request.getContractNumber(), null);
        validateContractDates(request.getStartDate(), request.getEndDate());

        Quote quote = quoteRepository.findById(quoteId)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Quote", quoteId));

        if (quote.getStatus() != QuoteStatus.ACCEPTED) {
            throw new BadRequestException("Only accepted quotes can be converted to contracts");
        }
        if (contractRepository.existsByTenantIdAndQuoteIdAndArchivedFalse(tenantId, quoteId)) {
            throw new BadRequestException("This quote has already been converted to a contract");
        }

        Company company = resolveCompany(quote.getCompanyId(), tenantId);
        Contact contact = resolveContact(quote.getContactId(), tenantId);
        UUID ownerId = resolveOwnerId(request.getOwnerId(), quote);

        Contract contract = Contract.builder()
                .contractNumber(request.getContractNumber())
                .title(request.getTitle() != null && !request.getTitle().isBlank()
                        ? request.getTitle().trim()
                        : deriveTitleFromQuote(quote))
                .companyId(company.getId())
                .company(company)
                .contactId(contact != null ? contact.getId() : null)
                .contact(contact)
                .quoteId(quote.getId())
                .quote(quote)
                .ownerId(ownerId)
                .owner(resolveOwner(ownerId, tenantId))
                .territory(company.getTerritory())
                .status(ContractStatus.DRAFT)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .autoRenew(Boolean.TRUE.equals(request.getAutoRenew()))
                .renewalNoticeDays(normalizeRenewalNoticeDays(request.getRenewalNoticeDays()))
                .contractValue(defaultMoney(quote.getTotal()))
                .notes(request.getNotes() != null ? request.getNotes() : quote.getNotes())
                .build();
        contract.setTenantId(tenantId);

        applyLifecycleDefaults(contract);
        contract = contractRepository.save(contract);
        log.info("Converted quote {} to contract {} for tenant {}", quoteId, contract.getId(), tenantId);
        return toDto(contract);
    }

    private Contract findActiveContract(UUID id) {
        UUID tenantId = requireTenantId();
        return contractRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Contract", id));
    }

    private void validateContractNumberUnique(UUID tenantId, String contractNumber, UUID currentId) {
        contractRepository.findByTenantIdAndContractNumberAndArchivedFalse(tenantId, contractNumber)
                .filter(existing -> !Objects.equals(existing.getId(), currentId))
                .ifPresent(existing -> {
                    throw new BadRequestException("Contract with number '" + contractNumber + "' already exists");
                });
    }

    private void validateContractDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BadRequestException("Contract start and end dates are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("Contract end date must be on or after the start date");
        }
    }

    private Company resolveCompany(UUID companyId, UUID tenantId) {
        return companyRepository.findById(companyId)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
    }

    private Contact resolveContact(UUID contactId, UUID tenantId) {
        if (contactId == null) {
            return null;
        }
        return contactRepository.findById(contactId)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Contact", contactId));
    }

    private Quote resolveQuote(UUID quoteId, UUID tenantId) {
        if (quoteId == null) {
            return null;
        }
        Quote quote = quoteRepository.findById(quoteId)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Quote", quoteId));
        if (quote.getStatus() == QuoteStatus.DECLINED || quote.getStatus() == QuoteStatus.EXPIRED) {
            throw new BadRequestException("Declined or expired quotes cannot be linked to contracts");
        }
        return quote;
    }

    private UUID resolveOwnerId(UUID requestedOwnerId, Quote quote) {
        if (requestedOwnerId != null) {
            return recordAccessService.resolveAssignableOwnerId(requestedOwnerId);
        }
        if (quote != null && quote.getOwnerId() != null) {
            return quote.getOwnerId();
        }
        return recordAccessService.requireCurrentUser().getId();
    }

    private User resolveOwner(UUID ownerId, UUID tenantId) {
        if (ownerId == null) {
            return null;
        }
        return userRepository.findById(ownerId)
                .filter(user -> user.getTenantId().equals(tenantId)
                        && Boolean.TRUE.equals(user.getIsActive())
                        && !Boolean.TRUE.equals(user.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
    }

    private Integer normalizeRenewalNoticeDays(Integer renewalNoticeDays) {
        if (renewalNoticeDays == null) {
            return 30;
        }
        if (renewalNoticeDays < 0) {
            throw new BadRequestException("Renewal notice days must be non-negative");
        }
        return renewalNoticeDays;
    }

    private BigDecimal defaultMoney(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private Invoice buildRenewalInvoice(Contract contract, UUID tenantId, String requestedInvoiceNumber) {
        Company company = resolveCompany(contract.getCompanyId(), tenantId);
        Contact contact = resolveContact(contract.getContactId(), tenantId);

        Invoice invoice = Invoice.builder()
                .invoiceNumber(generateUniqueInvoiceNumber(tenantId, requestedInvoiceNumber, contract.getContractNumber()))
                .companyId(company.getId())
                .company(company)
                .contactId(contact != null ? contact.getId() : null)
                .contact(contact)
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(Math.max(1, contract.getRenewalNoticeDays())))
                .status(InvoiceStatus.SENT)
                .paymentTerms("Contract renewal")
                .notes("Renewal invoice for contract " + contract.getContractNumber())
                .subtotal(defaultMoney(contract.getContractValue()))
                .tax(BigDecimal.ZERO)
                .total(defaultMoney(contract.getContractValue()))
                .build();
        invoice.setTenantId(tenantId);

        return invoice;
    }

    private List<InvoiceLineItem> buildRenewalInvoiceLineItems(Invoice invoice, Contract contract) {
        List<InvoiceLineItem> items = new ArrayList<>();
        Quote quote = contract.getQuote();
        if (quote != null && quote.getItems() != null && !quote.getItems().isEmpty()) {
            for (QuoteLineItem quoteItem : quote.getItems()) {
                InvoiceLineItem lineItem = InvoiceLineItem.builder()
                        .invoiceId(invoice.getId())
                        .invoice(invoice)
                        .productId(quoteItem.getProductId())
                        .product(quoteItem.getProduct())
                        .description(quoteItem.getDescription() != null && !quoteItem.getDescription().isBlank()
                                ? quoteItem.getDescription()
                                : "Renewal for " + contract.getContractNumber())
                        .quantity(quoteItem.getQuantity())
                        .unitPrice(quoteItem.getUnitPrice())
                        .discountPercent(quoteItem.getDiscountPercent())
                        .build();
                lineItem.calculateTotal();
                items.add(lineItem);
            }
        }

        if (!items.isEmpty()) {
            return items;
        }

        InvoiceLineItem genericItem = InvoiceLineItem.builder()
                .invoiceId(invoice.getId())
                .invoice(invoice)
                .description("Renewal for contract " + contract.getContractNumber())
                .quantity(1)
                .unitPrice(defaultMoney(contract.getContractValue()))
                .discountPercent(BigDecimal.ZERO)
                .build();
        genericItem.calculateTotal();
        items.add(genericItem);
        return items;
    }

    private String generateUniqueInvoiceNumber(UUID tenantId, String requestedInvoiceNumber, String contractNumber) {
        String base = requestedInvoiceNumber != null && !requestedInvoiceNumber.isBlank()
                ? requestedInvoiceNumber.trim()
                : "REN-" + contractNumber;
        String candidate = base;
        int suffix = 1;
        while (invoiceRepository.existsByTenantIdAndInvoiceNumber(tenantId, candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String generateUniqueContractNumber(UUID tenantId, String baseContractNumber) {
        String base = baseContractNumber;
        String candidate = base;
        int suffix = 1;
        while (contractRepository.existsByTenantIdAndContractNumberAndArchivedFalse(tenantId, candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String buildRenewalNotes(Contract contract) {
        String originalNotes = contract.getNotes() != null && !contract.getNotes().isBlank()
                ? contract.getNotes().trim() + "\n\n"
                : "";
        return originalNotes + "Renewed from contract " + contract.getContractNumber();
    }

    private void applyLifecycleDefaults(Contract contract) {
        contract.setRenewalNoticeDays(normalizeRenewalNoticeDays(contract.getRenewalNoticeDays()));
        contract.setRenewalDate(contract.getEndDate() != null
                ? contract.getEndDate().minusDays(contract.getRenewalNoticeDays())
                : null);
        contract.setTerritory(contract.getCompany() != null ? contract.getCompany().getTerritory() : contract.getTerritory());

        if (contract.getStatus() == ContractStatus.ACTIVE && contract.getActivatedAt() == null) {
            contract.setActivatedAt(LocalDateTime.now());
        }
        if (contract.getStatus() != ContractStatus.TERMINATED) {
            contract.setTerminatedAt(null);
            if (contract.getStatus() != ContractStatus.EXPIRED) {
                contract.setTerminationReason(null);
            }
        } else if (contract.getTerminatedAt() == null) {
            contract.setTerminatedAt(LocalDateTime.now());
        }
    }

    private ContractResponseDTO toDto(Contract contract) {
        return ContractResponseDTO.builder()
                .id(contract.getId())
                .tenantId(contract.getTenantId())
                .contractNumber(contract.getContractNumber())
                .title(contract.getTitle())
                .companyId(contract.getCompanyId())
                .companyName(contract.getCompany() != null ? contract.getCompany().getName() : null)
                .contactId(contract.getContactId())
                .contactName(buildContactName(contract.getContact()))
                .quoteId(contract.getQuoteId())
                .quoteNumber(contract.getQuote() != null ? contract.getQuote().getQuoteNumber() : null)
                .ownerId(contract.getOwnerId())
                .ownerName(buildOwnerName(contract.getOwner()))
                .territory(contract.getTerritory())
                .status(contract.getStatus())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .renewalDate(contract.getRenewalDate())
                .autoRenew(contract.getAutoRenew())
                .renewalNoticeDays(contract.getRenewalNoticeDays())
                .contractValue(contract.getContractValue())
                .renewalInvoiceId(contract.getRenewalInvoiceId())
                .renewalInvoiceGeneratedAt(contract.getRenewalInvoiceGeneratedAt())
                .renewedFromContractId(contract.getRenewedFromContractId())
                .renewedToContractId(contract.getRenewedToContractId())
                .activatedAt(contract.getActivatedAt())
                .terminatedAt(contract.getTerminatedAt())
                .terminationReason(contract.getTerminationReason())
                .notes(contract.getNotes())
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .createdBy(contract.getCreatedBy())
                .updatedBy(contract.getUpdatedBy())
                .build();
    }

    private String buildContactName(Contact contact) {
        if (contact == null) {
            return null;
        }
        String firstName = contact.getFirstName() != null ? contact.getFirstName() : "";
        String lastName = contact.getLastName() != null ? contact.getLastName() : "";
        return (firstName + " " + lastName).trim();
    }

    private String buildOwnerName(User owner) {
        if (owner == null) {
            return null;
        }
        String firstName = owner.getFirstName() != null ? owner.getFirstName() : "";
        String lastName = owner.getLastName() != null ? owner.getLastName() : "";
        return (firstName + " " + lastName).trim();
    }

    private String deriveTitleFromQuote(Quote quote) {
        if (quote.getTitle() != null && !quote.getTitle().isBlank()) {
            return quote.getTitle().trim();
        }
        return "Contract for " + quote.getQuoteNumber();
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is required");
        }
        return tenantId;
    }
}
