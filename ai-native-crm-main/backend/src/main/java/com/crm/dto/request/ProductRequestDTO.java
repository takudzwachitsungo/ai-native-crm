package com.crm.dto.request;

import com.crm.entity.enums.ProductCategory;
import com.crm.entity.enums.ProductStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestDTO {
    
    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Product name must be less than 200 characters")
    private String name;
    
    @Size(max = 100, message = "SKU must be less than 100 characters")
    private String sku;
    
    private String description;
    
    @NotNull(message = "Category is required")
    private ProductCategory category;
    
    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    private BigDecimal unitPrice;
    
    @DecimalMin(value = "0.0", message = "Cost must be non-negative")
    private BigDecimal cost;

    @DecimalMin(value = "0.0", message = "Minimum price must be non-negative")
    private BigDecimal minimumPrice;

    private Boolean allowDiscounting;

    @DecimalMin(value = "0.0", message = "Max discount percent must be non-negative")
    private BigDecimal maxDiscountPercent;

    private Boolean configurable;

    private Boolean bundleOnly;

    @Min(value = 1, message = "Minimum quantity must be at least 1")
    private Integer minimumQuantity;

    @Min(value = 1, message = "Maximum quantity must be at least 1")
    private Integer maximumQuantity;

    @Min(value = 1, message = "Bundle size must be at least 1")
    private Integer bundleSize;
    
    @Min(value = 0, message = "Stock quantity must be non-negative")
    private Integer stockQuantity;
    
    @Min(value = 0, message = "Low stock threshold must be non-negative")
    private Integer lowStockThreshold;
    
    @NotNull(message = "Status is required")
    private ProductStatus status;
    
    private Boolean trackInventory;
    
    private String unit;
    
    private BigDecimal taxRate;
}
