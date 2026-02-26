package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.QuoteFilterDTO;
import com.crm.dto.request.QuoteLineItemRequestDTO;
import com.crm.dto.request.QuoteRequestDTO;
import com.crm.dto.response.QuoteResponseDTO;
import com.crm.entity.*;
import com.crm.entity.enums.QuoteStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.QuoteLineItemMapper;
import com.crm.mapper.QuoteMapper;
import com.crm.repository.*;
import com.crm.service.QuoteService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuoteServiceImpl implements QuoteService {

    private final QuoteRepository quoteRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final QuoteMapper quoteMapper;
    private final QuoteLineItemMapper lineItemMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<QuoteResponseDTO> findAll(Pageable pageable, QuoteFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Quote>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("quoteNumber")), search),
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
            
            if (filter.getOwnerId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("owner").get("id"), filter.getOwnerId()));
            }
        }
        
        Specification<Quote> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Quote> quotes = quoteRepository.findAll(spec, pageable);
        
        return quotes.map(quoteMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "quotes", key = "#id")
    public QuoteResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Quote quote = quoteRepository.findById(id)
                .filter(q -> q.getTenantId().equals(tenantId) && !q.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Quote", id));
        
        return quoteMapper.toDto(quote);
    }

    @Override
    @Transactional
    @CacheEvict(value = "quotes", allEntries = true)
    public QuoteResponseDTO create(QuoteRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        // Check if quote number is unique
        boolean exists = quoteRepository.existsByTenantIdAndQuoteNumber(tenantId, request.getQuoteNumber());
        if (exists) {
            throw new BadRequestException("Quote with number '" + request.getQuoteNumber() + "' already exists");
        }
        
        Quote quote = quoteMapper.toEntity(request);
        quote.setTenantId(tenantId);
        // Initialize defaults (mapper may not set them)
        if (quote.getSubtotal() == null) quote.setSubtotal(BigDecimal.ZERO);
        if (quote.getDiscount() == null) quote.setDiscount(BigDecimal.ZERO);
        if (quote.getTotal() == null) quote.setTotal(BigDecimal.ZERO);
        
        // Set company
        Company company = companyRepository.findById(request.getCompanyId())
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
        quote.setCompany(company);
        
        // Set contact if provided
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            quote.setContact(contact);
        }
        
        // Set owner if provided, otherwise default to current user
        if (request.getOwnerId() != null) {
            User owner = userRepository.findById(request.getOwnerId())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getOwnerId()));
            quote.setOwner(owner);
        } else {
            // Default to current user as owner
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && 
                authentication.getPrincipal() instanceof User) {
                User currentUser = (User) authentication.getPrincipal();
                if (currentUser.getTenantId().equals(tenantId) && currentUser.getIsActive()) {
                    quote.setOwner(currentUser);
                }
            }
        }
        
        quote = quoteRepository.save(quote);
        
        // Create line items
        List<QuoteLineItem> lineItems = createLineItems(quote, request.getLineItems());
        // Calculate line item totals before adding to quote
        lineItems.forEach(QuoteLineItem::calculateTotal);
        quote.getItems().addAll(lineItems);
        
        // Calculate totals based on line items
        quote.calculateTotals();
        quote = quoteRepository.save(quote);
        
        log.info("Created quote: {} for tenant: {}", quote.getId(), tenantId);
        
        return quoteMapper.toDto(quote);
    }

    @Override
    @Transactional
    @CacheEvict(value = "quotes", allEntries = true)
    public QuoteResponseDTO update(UUID id, QuoteRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Quote quote = quoteRepository.findById(id)
                .filter(q -> q.getTenantId().equals(tenantId) && !q.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Quote", id));
        
        // Check if new quote number is unique
        if (!request.getQuoteNumber().equals(quote.getQuoteNumber())) {
            boolean exists = quoteRepository.existsByTenantIdAndQuoteNumber(tenantId, request.getQuoteNumber());
            if (exists) {
                throw new BadRequestException("Quote with number '" + request.getQuoteNumber() + "' already exists");
            }
        }
        
        // Update relationships
        Company company = companyRepository.findById(request.getCompanyId())
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
        quote.setCompany(company);
        
        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            quote.setContact(contact);
        }
        
        if (request.getOwnerId() != null) {
            User owner = userRepository.findById(request.getOwnerId())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getOwnerId()));
            quote.setOwner(owner);
        }
        
        // Update fields
        quote.setQuoteNumber(request.getQuoteNumber());
        quote.setIssueDate(request.getIssueDate());
        quote.setExpiryDate(request.getValidUntil());
        quote.setStatus(request.getStatus());
        quote.setNotes(request.getNotes());
        quote.setPaymentTerms(request.getTerms());
        quote.setDiscount(request.getDiscountAmount());
        
        // Remove old line items and create new ones
        quote.getItems().clear();
        List<QuoteLineItem> lineItems = createLineItems(quote, request.getLineItems());
        quote.getItems().addAll(lineItems);
        
        quote = quoteRepository.save(quote);
        
        log.info("Updated quote: {} for tenant: {}", id, tenantId);
        
        return quoteMapper.toDto(quote);
    }

    @Override
    @Transactional
    @CacheEvict(value = "quotes", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Quote quote = quoteRepository.findById(id)
                .filter(q -> q.getTenantId().equals(tenantId) && !q.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Quote", id));
        
        quote.setArchived(true);
        quoteRepository.save(quote);
        
        log.info("Deleted (archived) quote: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "quotes", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Quote> quotes = quoteRepository.findAllById(ids).stream()
                .filter(q -> q.getTenantId().equals(tenantId) && !q.getArchived())
                .collect(Collectors.toList());
        
        if (quotes.isEmpty()) {
            throw new BadRequestException("No valid quotes found for deletion");
        }
        
        quotes.forEach(quote -> quote.setArchived(true));
        quoteRepository.saveAll(quotes);
        
        log.info("Bulk deleted {} quotes for tenant: {}", quotes.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "quotes", allEntries = true)
    public QuoteResponseDTO updateStatus(UUID id, String statusStr) {
        UUID tenantId = TenantContext.getTenantId();
        
        Quote quote = quoteRepository.findById(id)
                .filter(q -> q.getTenantId().equals(tenantId) && !q.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Quote", id));
        
        try {
            QuoteStatus status = QuoteStatus.valueOf(statusStr.toUpperCase());
            quote.setStatus(status);
            quote = quoteRepository.save(quote);
            
            log.info("Updated quote status: {} to {} for tenant: {}", id, status, tenantId);
            
            return quoteMapper.toDto(quote);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid quote status: " + statusStr);
        }
    }

    private List<QuoteLineItem> createLineItems(Quote quote, List<QuoteLineItemRequestDTO> lineItemDTOs) {
        UUID tenantId = TenantContext.getTenantId();
        
        return lineItemDTOs.stream().map(dto -> {
            Product product = productRepository.findById(dto.getProductId())
                    .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", dto.getProductId()));
            
            QuoteLineItem lineItem = lineItemMapper.toEntity(dto);
            lineItem.setQuoteId(quote.getId());
            lineItem.setQuote(quote);
            lineItem.setProductId(product.getId());
            lineItem.setProduct(product);
            
            return lineItem;
        }).collect(Collectors.toList());
    }
}
