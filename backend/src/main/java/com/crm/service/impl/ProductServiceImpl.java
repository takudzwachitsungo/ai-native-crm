package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.ProductFilterDTO;
import com.crm.dto.request.ProductRequestDTO;
import com.crm.dto.response.ProductResponseDTO;
import com.crm.entity.Product;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.ProductMapper;
import com.crm.repository.ProductRepository;
import com.crm.service.ProductService;
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

import java.util.ArrayList;
import java.util.Objects;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponseDTO> findAll(Pageable pageable, ProductFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Product>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("sku")), search),
                    cb.like(cb.lower(root.get("description")), search)
                ));
            }
            
            if (filter.getCategory() != null) {
                specs.add(SpecificationBuilder.equal("category", filter.getCategory()));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getMinPrice() != null) {
                specs.add(SpecificationBuilder.greaterThan("price", filter.getMinPrice()));
            }
            
            if (filter.getMaxPrice() != null) {
                specs.add(SpecificationBuilder.lessThan("price", filter.getMaxPrice()));
            }
            
            if (Boolean.TRUE.equals(filter.getLowStockOnly())) {
                specs.add((root, query, cb) -> cb.and(
                    cb.isTrue(root.get("trackInventory")),
                    cb.lessThanOrEqualTo(root.get("stockQuantity"), root.get("lowStockThreshold"))
                ));
            }
        }
        
        Specification<Product> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Product> products = productRepository.findAll(spec, pageable);
        
        return products.map(productMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "products", key = "#id")
    public ProductResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Product product = productRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        return productMapper.toDto(product);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponseDTO create(ProductRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        // Check if SKU is unique
        if (request.getSku() != null) {
            boolean exists = productRepository.existsByTenantIdAndSku(
                    tenantId, request.getSku());
            if (exists) {
                throw new BadRequestException("Product with SKU '" + request.getSku() + "' already exists");
            }
        }
        
        Product product = productMapper.toEntity(request);
        product.setTenantId(tenantId);
        applyPricingDefaults(product);
        
        product = productRepository.save(product);
        log.info("Created product: {} for tenant: {}", product.getId(), tenantId);
        
        return productMapper.toDto(product);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponseDTO update(UUID id, ProductRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Product product = productRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        // Check if new SKU is unique
        if (request.getSku() != null && !request.getSku().equals(product.getSku())) {
            boolean exists = productRepository.existsByTenantIdAndSku(
                    tenantId, request.getSku());
            if (exists) {
                throw new BadRequestException("Product with SKU '" + request.getSku() + "' already exists");
            }
        }
        
        productMapper.updateEntity(request, product);
        applyPricingDefaults(product);
        product = productRepository.save(product);
        
        log.info("Updated product: {} for tenant: {}", id, tenantId);
        
        return productMapper.toDto(product);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Product product = productRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        product.setArchived(true);
        productRepository.save(product);
        
        log.info("Deleted (archived) product: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Product> products = productRepository.findAllById(ids).stream()
                .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                .collect(Collectors.toList());
        
        if (products.isEmpty()) {
            throw new BadRequestException("No valid products found for deletion");
        }
        
        products.forEach(product -> product.setArchived(true));
        productRepository.saveAll(products);
        
        log.info("Bulk deleted {} products for tenant: {}", products.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponseDTO> findLowStockProducts() {
        UUID tenantId = TenantContext.getTenantId();
        
        // TODO: Implement low stock query - for now return all products
        List<Product> products = productRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        return products.stream()
                .map(productMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductResponseDTO adjustStock(UUID id, Integer quantityChange) {
        UUID tenantId = TenantContext.getTenantId();
        
        Product product = productRepository.findById(id)
                .filter(p -> p.getTenantId().equals(tenantId) && !p.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        
        int newQuantity = (product.getStockQuantity() != null ? product.getStockQuantity() : 0) + quantityChange;
        
        if (newQuantity < 0) {
            throw new BadRequestException("Insufficient stock. Available: " + product.getStockQuantity());
        }
        
        product.setStockQuantity(newQuantity);
        product = productRepository.save(product);
        
        log.info("Adjusted stock for product: {} by {} to {} for tenant: {}", 
                id, quantityChange, newQuantity, tenantId);
        
        return productMapper.toDto(product);
    }

    private void applyPricingDefaults(Product product) {
        if (product.getAllowDiscounting() == null) {
            product.setAllowDiscounting(Boolean.TRUE);
        }
        if (product.getConfigurable() == null) {
            product.setConfigurable(Boolean.FALSE);
        }
        if (product.getBundleOnly() == null) {
            product.setBundleOnly(Boolean.FALSE);
        }
        if (product.getMaxDiscountPercent() == null) {
            product.setMaxDiscountPercent(java.math.BigDecimal.valueOf(100));
        }
        if (product.getBundleSize() == null || product.getBundleSize() < 1) {
            product.setBundleSize(1);
        }
        if (product.getMinimumQuantity() != null && product.getMinimumQuantity() < 1) {
            product.setMinimumQuantity(1);
        }
        if (product.getMaximumQuantity() != null && product.getMaximumQuantity() < 1) {
            product.setMaximumQuantity(1);
        }
        if (product.getMinimumQuantity() != null && product.getMaximumQuantity() != null
                && product.getMaximumQuantity() < product.getMinimumQuantity()) {
            product.setMaximumQuantity(product.getMinimumQuantity());
        }
        if (Boolean.TRUE.equals(product.getBundleOnly())) {
            int bundleSize = Objects.requireNonNullElse(product.getBundleSize(), 1);
            if (product.getMinimumQuantity() == null || product.getMinimumQuantity() < bundleSize) {
                product.setMinimumQuantity(bundleSize);
            }
        }
    }
}
