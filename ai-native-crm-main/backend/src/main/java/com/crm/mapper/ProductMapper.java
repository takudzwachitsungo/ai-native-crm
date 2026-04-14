package com.crm.mapper;

import com.crm.dto.request.ProductRequestDTO;
import com.crm.dto.response.ProductResponseDTO;
import com.crm.entity.Product;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProductMapper {
    
    @Mapping(target = "unitPrice", source = "price")
    @Mapping(target = "profitMargin", expression = "java(calculateProfitMargin(product))")
    @Mapping(target = "isLowStock", expression = "java(isLowStock(product))")
    ProductResponseDTO toDto(Product product);
    
    @Mapping(target = "price", source = "unitPrice")
    Product toEntity(ProductRequestDTO dto);
    
    @Mapping(target = "price", source = "unitPrice")
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ProductRequestDTO dto, @MappingTarget Product product);
    
    default BigDecimal calculateProfitMargin(Product product) {
        if (product.getCost() == null || product.getPrice() == null ||
                product.getCost().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal profit = product.getPrice().subtract(product.getCost());
        return profit.divide(product.getCost(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
    
    default Boolean isLowStock(Product product) {
        // Stock tracking would require additional fields in Product entity
        return false;
    }
}
