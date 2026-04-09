package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.InvoiceFilterDTO;
import com.crm.dto.request.InvoiceLineItemRequestDTO;
import com.crm.dto.request.InvoiceRequestDTO;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.dto.response.InvoiceResponseDTO;
import com.crm.entity.*;
import com.crm.entity.enums.InvoiceStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.InvoiceLineItemMapper;
import com.crm.mapper.InvoiceMapper;
import com.crm.repository.*;
import com.crm.service.InvoiceService;
import com.crm.service.WorkspaceErpSyncService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InvoiceMapper invoiceMapper;
    private final InvoiceLineItemMapper lineItemMapper;
    private final WorkspaceErpSyncService workspaceErpSyncService;

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponseDTO> findAll(Pageable pageable, InvoiceFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Invoice>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("invoiceNumber")), search),
                    cb.like(cb.lower(root.get("notes")), search)
                ));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getCompanyId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("company").get("id"), filter.getCompanyId()));
            }
            
            if (filter.getContactId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("contact").get("id"), filter.getContactId()));
            }
            
            if (filter.getIssueDateFrom() != null && filter.getIssueDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("issueDate", filter.getIssueDateFrom(), filter.getIssueDateTo()));
            }
            
            if (filter.getDueDateFrom() != null && filter.getDueDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("dueDate", filter.getDueDateFrom(), filter.getDueDateTo()));
            }
            
            if (Boolean.TRUE.equals(filter.getOverdueOnly())) {
                specs.add((root, query, cb) -> cb.and(
                    cb.lessThan(root.get("dueDate"), LocalDate.now()),
                    cb.notEqual(root.get("status"), InvoiceStatus.PAID)
                ));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("owner").get("id"), filter.getOwnerId()));
            }
        }
        
        Specification<Invoice> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Invoice> invoices = invoiceRepository.findAll(spec, pageable);
        
        return invoices.map(invoiceMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "invoices", key = "#id")
    public InvoiceResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        
        return invoiceMapper.toDto(invoice);
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public InvoiceResponseDTO create(InvoiceRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        // Check if invoice number is unique
        boolean exists = invoiceRepository.existsByTenantIdAndInvoiceNumber(tenantId, request.getInvoiceNumber());
        if (exists) {
            throw new BadRequestException("Invoice with number '" + request.getInvoiceNumber() + "' already exists");
        }
        
        Invoice invoice = invoiceMapper.toEntity(request);
        invoice.setTenantId(tenantId);
        // Initialize defaults (mapper may not set them)
        if (invoice.getSubtotal() == null) invoice.setSubtotal(BigDecimal.ZERO);
        if (invoice.getTax() == null) invoice.setTax(BigDecimal.ZERO);
        if (invoice.getTotal() == null) invoice.setTotal(BigDecimal.ZERO);
        
        // Set company
        Company company = companyRepository.findById(request.getCompanyId())
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
        invoice.setCompany(company);
        
        // Set contact if provided
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            invoice.setContact(contact);
        }
        
        // Invoice does not have an owner field - skip owner assignment
        
        invoice = invoiceRepository.save(invoice);
        
        // Create line items
        List<InvoiceLineItem> lineItems = createLineItems(invoice, request.getLineItems());
        // Calculate line item totals before adding to invoice
        lineItems.forEach(InvoiceLineItem::calculateTotal);
        invoice.getItems().addAll(lineItems);
        
        // Calculate totals based on line items
        invoice.calculateTotals();
        invoice = invoiceRepository.save(invoice);
        
        log.info("Created invoice: {} for tenant: {}", invoice.getId(), tenantId);
        
        return invoiceMapper.toDto(invoice);
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public InvoiceResponseDTO update(UUID id, InvoiceRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        
        // Check if new invoice number is unique
        if (!request.getInvoiceNumber().equals(invoice.getInvoiceNumber())) {
            boolean exists = invoiceRepository.existsByTenantIdAndInvoiceNumber(tenantId, request.getInvoiceNumber());
            if (exists) {
                throw new BadRequestException("Invoice with number '" + request.getInvoiceNumber() + "' already exists");
            }
        }
        
        // Update relationships
        Company company = companyRepository.findById(request.getCompanyId())
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
        invoice.setCompany(company);
        
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            invoice.setContact(contact);
        }
        
        // Invoice does not have an owner field - skip owner assignment
        
        // Update fields
        invoice.setInvoiceNumber(request.getInvoiceNumber());
        invoice.setIssueDate(request.getIssueDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setStatus(request.getStatus());
        invoice.setPaymentDate(request.getPaidDate());
        invoice.setNotes(request.getNotes());
        invoice.setPaymentTerms(request.getTerms());
        invoice.setTax(request.getTaxRate());
        // Invoice entity has no discountAmount field
        
        // Remove old line items and create new ones
        invoice.getItems().clear();
        List<InvoiceLineItem> lineItems = createLineItems(invoice, request.getLineItems());
        invoice.getItems().addAll(lineItems);
        
        invoice = invoiceRepository.save(invoice);
        
        log.info("Updated invoice: {} for tenant: {}", id, tenantId);
        
        return invoiceMapper.toDto(invoice);
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        
        invoice.setArchived(true);
        invoiceRepository.save(invoice);
        
        log.info("Deleted (archived) invoice: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Invoice> invoices = invoiceRepository.findAllById(ids).stream()
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .collect(Collectors.toList());
        
        if (invoices.isEmpty()) {
            throw new BadRequestException("No valid invoices found for deletion");
        }
        
        invoices.forEach(invoice -> invoice.setArchived(true));
        invoiceRepository.saveAll(invoices);
        
        log.info("Bulk deleted {} invoices for tenant: {}", invoices.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public InvoiceResponseDTO updateStatus(UUID id, String statusStr) {
        UUID tenantId = TenantContext.getTenantId();
        
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        
        try {
            InvoiceStatus status = InvoiceStatus.valueOf(statusStr.toUpperCase());
            invoice.setStatus(status);
            
            if (status == InvoiceStatus.PAID && invoice.getPaymentDate() == null) {
                invoice.setPaymentDate(LocalDate.now());
            }
            
            invoice = invoiceRepository.save(invoice);
            
            log.info("Updated invoice status: {} to {} for tenant: {}", id, status, tenantId);
            
            return invoiceMapper.toDto(invoice);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid invoice status: " + statusStr);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public InvoiceResponseDTO markAsPaid(UUID id, LocalDate paidDate) {
        UUID tenantId = TenantContext.getTenantId();
        
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> i.getTenantId().equals(tenantId) && !i.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaymentDate(paidDate != null ? paidDate : LocalDate.now());
        invoice = invoiceRepository.save(invoice);
        
        log.info("Marked invoice as paid: {} for tenant: {}", id, tenantId);
        
        return invoiceMapper.toDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> findOverdueInvoices() {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Invoice> invoices = invoiceRepository.findOverdueInvoices(tenantId, LocalDate.now());
        return invoices.stream()
                .map(invoiceMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "invoices", allEntries = true)
    public IntegrationSyncResultDTO syncToErp(UUID id, String providerKey) {
        UUID tenantId = TenantContext.getTenantId();
        Invoice invoice = invoiceRepository.findById(id)
                .filter(item -> tenantId.equals(item.getTenantId()) && !item.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        return workspaceErpSyncService.exportInvoice(invoice.getId(), providerKey);
    }

    private List<InvoiceLineItem> createLineItems(Invoice invoice, List<InvoiceLineItemRequestDTO> lineItemDTOs) {
        UUID tenantId = TenantContext.getTenantId();
        
        return lineItemDTOs.stream().map(dto -> {
            Product product = productRepository.findById(dto.getProductId())
                    .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", dto.getProductId()));
            
            InvoiceLineItem lineItem = lineItemMapper.toEntity(dto);
            lineItem.setInvoiceId(invoice.getId());
            lineItem.setInvoice(invoice);
            lineItem.setProductId(product.getId());
            lineItem.setProduct(product);
            
            return lineItem;
        }).collect(Collectors.toList());
    }
}
