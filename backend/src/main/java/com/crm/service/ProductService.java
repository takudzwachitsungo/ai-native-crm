package com.crm.service;

import com.crm.dto.request.ProductFilterDTO;
import com.crm.dto.request.ProductRequestDTO;
import com.crm.dto.response.ProductResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ProductService {
    
    Page<ProductResponseDTO> findAll(Pageable pageable, ProductFilterDTO filter);
    
    ProductResponseDTO findById(UUID id);
    
    ProductResponseDTO create(ProductRequestDTO request);
    
    ProductResponseDTO update(UUID id, ProductRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<ProductResponseDTO> findLowStockProducts();
    
    ProductResponseDTO adjustStock(UUID id, Integer quantityChange);
}
