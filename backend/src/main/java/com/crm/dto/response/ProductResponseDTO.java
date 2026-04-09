package com.crm.dto.response;

import com.crm.entity.enums.ProductCategory;
import com.crm.entity.enums.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String name;
    private String sku;
    private String description;
    private ProductCategory category;
    private BigDecimal unitPrice;
    private BigDecimal cost;
    private BigDecimal minimumPrice;
    private Boolean allowDiscounting;
    private BigDecimal maxDiscountPercent;
    private Boolean configurable;
    private Boolean bundleOnly;
    private Integer minimumQuantity;
    private Integer maximumQuantity;
    private Integer bundleSize;
    private Integer stockQuantity;
    private Integer lowStockThreshold;
    private ProductStatus status;
    private Boolean trackInventory;
    private String unit;
    private BigDecimal taxRate;
    private BigDecimal profitMargin;
    private Boolean isLowStock;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
