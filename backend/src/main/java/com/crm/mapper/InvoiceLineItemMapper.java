package com.crm.mapper;

import com.crm.dto.request.InvoiceLineItemRequestDTO;
import com.crm.dto.response.InvoiceLineItemResponseDTO;
import com.crm.entity.InvoiceLineItem;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface InvoiceLineItemMapper {
    
    @Mapping(target = "productId", expression = "java(getProductId(lineItem))")
    @Mapping(target = "productName", expression = "java(getProductName(lineItem))")
    @Mapping(target = "productSku", expression = "java(getProductSku(lineItem))")
    @Mapping(target = "lineTotal", expression = "java(calculateLineTotal(lineItem))")
    InvoiceLineItemResponseDTO toDto(InvoiceLineItem lineItem);
    
    @Mapping(target = "invoice", ignore = true)
    @Mapping(target = "product", ignore = true)
    InvoiceLineItem toEntity(InvoiceLineItemRequestDTO dto);
    
    default UUID getProductId(InvoiceLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getId() : null;
    }
    
    default String getProductName(InvoiceLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getName() : null;
    }
    
    default String getProductSku(InvoiceLineItem lineItem) {
        return lineItem.getProduct() != null ? lineItem.getProduct().getSku() : null;
    }
    
    default BigDecimal calculateLineTotal(InvoiceLineItem lineItem) {
        BigDecimal total = lineItem.getUnitPrice().multiply(BigDecimal.valueOf(lineItem.getQuantity()));
        
        if (lineItem.getDiscountPercent() != null && lineItem.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal discount = total.multiply(lineItem.getDiscountPercent()).divide(BigDecimal.valueOf(100));
            total = total.subtract(discount);
        }
        
        return total;
    }
}
