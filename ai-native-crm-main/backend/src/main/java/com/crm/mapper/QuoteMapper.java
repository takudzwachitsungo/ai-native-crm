package com.crm.mapper;

import com.crm.dto.request.QuoteRequestDTO;
import com.crm.dto.response.QuoteResponseDTO;
import com.crm.entity.Quote;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {QuoteLineItemMapper.class})
public interface QuoteMapper {
    
    @Mapping(target = "companyId", expression = "java(getCompanyId(quote))")
    @Mapping(target = "companyName", expression = "java(getCompanyName(quote))")
    @Mapping(target = "contactId", expression = "java(getContactId(quote))")
    @Mapping(target = "contactName", expression = "java(getContactName(quote))")
    @Mapping(target = "ownerId", expression = "java(getOwnerId(quote))")
    @Mapping(target = "ownerName", expression = "java(getOwnerName(quote))")
    @Mapping(target = "subtotal", expression = "java(calculateSubtotal(quote))")
    @Mapping(target = "taxAmount", expression = "java(calculateTaxAmount(quote))")
    @Mapping(target = "total", expression = "java(calculateTotal(quote))")
    @Mapping(source = "items", target = "lineItems")
    @Mapping(source = "expiryDate", target = "validUntil")
    QuoteResponseDTO toDto(Quote quote);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "items", ignore = true)
    @Mapping(source = "validUntil", target = "expiryDate")
    Quote toEntity(QuoteRequestDTO dto);
    
    default UUID getCompanyId(Quote quote) {
        return quote.getCompany() != null ? quote.getCompany().getId() : null;
    }
    
    default String getCompanyName(Quote quote) {
        return quote.getCompany() != null ? quote.getCompany().getName() : null;
    }
    
    default UUID getContactId(Quote quote) {
        return quote.getContact() != null ? quote.getContact().getId() : null;
    }
    
    default String getContactName(Quote quote) {
        if (quote.getContact() == null) return null;
        return quote.getContact().getFirstName() + " " + quote.getContact().getLastName();
    }
    
    default UUID getOwnerId(Quote quote) {
        return quote.getOwner() != null ? quote.getOwner().getId() : null;
    }
    
    default String getOwnerName(Quote quote) {
        if (quote.getOwner() == null) return null;
        return quote.getOwner().getFirstName() + " " + quote.getOwner().getLastName();
    }
    
    default BigDecimal calculateSubtotal(Quote quote) {
        if (quote.getItems() == null || quote.getItems().isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        return quote.getItems().stream()
                .map(item -> {
                    BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                    if (item.getDiscountPercent() != null && item.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal discount = lineTotal.multiply(item.getDiscountPercent()).divide(BigDecimal.valueOf(100));
                        lineTotal = lineTotal.subtract(discount);
                    }
                    return lineTotal;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    default BigDecimal calculateTaxAmount(Quote quote) {
        BigDecimal subtotal = calculateSubtotal(quote);
        
        if (quote.getDiscount() != null && quote.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            subtotal = subtotal.subtract(quote.getDiscount());
        }
        
        // Quote entity does not have a taxRate field
        return BigDecimal.ZERO;
    }
    
    default BigDecimal calculateTotal(Quote quote) {
        BigDecimal subtotal = calculateSubtotal(quote);
        BigDecimal taxAmount = calculateTaxAmount(quote);
        
        BigDecimal total = subtotal.add(taxAmount);
        
        if (quote.getDiscount() != null && quote.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            total = total.subtract(quote.getDiscount());
        }
        
        return total;
    }
}
