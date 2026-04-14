package com.crm.mapper;

import com.crm.dto.request.QuoteLineItemRequestDTO;
import com.crm.dto.response.QuoteLineItemResponseDTO;
import com.crm.entity.QuoteLineItem;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface QuoteLineItemMapper {
    
    @Mapping(target = "productId", expression = "java(getProductId(lineItem))")
    @Mapping(target = "productName", expression = "java(getProductName(lineItem))")
    @Mapping(target = "productSku", expression = "java(getProductSku(lineItem))")
    @Mapping(target = "lineTotal", expression = "java(calculateLineTotal(lineItem))")
    QuoteLineItemResponseDTO toDto(QuoteLineItem lineItem);
    
    @Mapping(target = "quote", ignore = true)
    @Mapping(target = "product", ignore = true)
    QuoteLineItem toEntity(QuoteLineItemRequestDTO dto);
    
    default UUID getProductId(QuoteLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getId() : null;
    }
    
    default String getProductName(QuoteLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getName() : null;
    }
    
    default String getProductSku(QuoteLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getSku() : null;
    }
    
    default BigDecimal calculateLineTotal(QuoteLineItem lineItem) {
        BigDecimal total = lineItem.getUnitPrice().multiply(BigDecimal.valueOf(lineItem.getQuantity()));
        
        if (lineItem.getDiscountPercent() != null && lineItem.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal discount = total.multiply(lineItem.getDiscountPercent()).divide(BigDecimal.valueOf(100));
            total = total.subtract(discount);
        }
        
        return total;
    }
}
