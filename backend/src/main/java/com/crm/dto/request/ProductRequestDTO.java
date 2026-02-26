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
