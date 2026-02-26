package com.crm.mapper;

import com.crm.dto.request.InvoiceRequestDTO;
import com.crm.dto.response.InvoiceResponseDTO;
import com.crm.entity.Invoice;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {InvoiceLineItemMapper.class})
public interface InvoiceMapper {
    
    @Mapping(source = "items", target = "lineItems")
    @Mapping(target = "companyId", expression = "java(getCompanyId(invoice))")
    @Mapping(target = "companyName", expression = "java(getCompanyName(invoice))")
    @Mapping(target = "contactId", expression = "java(getContactId(invoice))")
    @Mapping(target = "contactName", expression = "java(getContactName(invoice))")
    @Mapping(target = "subtotal", expression = "java(calculateSubtotal(invoice))")
    @Mapping(target = "taxAmount", expression = "java(calculateTaxAmount(invoice))")
    @Mapping(target = "total", expression = "java(calculateTotal(invoice))")
    @Mapping(target = "isOverdue", expression = "java(isOverdue(invoice))")
    InvoiceResponseDTO toDto(Invoice invoice);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "items", ignore = true)
    Invoice toEntity(InvoiceRequestDTO dto);
    
    default UUID getCompanyId(Invoice invoice) {
        return invoice.getCompany() != null ? invoice.getCompany().getId() : null;
    }
    
    default String getCompanyName(Invoice invoice) {
        return invoice.getCompany() != null ? invoice.getCompany().getName() : null;
    }
    
    default UUID getContactId(Invoice invoice) {
        return invoice.getContact() != null ? invoice.getContact().getId() : null;
    }
    
    default String getContactName(Invoice invoice) {
        if (invoice.getContact() == null) return null;
        return invoice.getContact().getFirstName() + " " + invoice.getContact().getLastName();
    }
    
    default BigDecimal calculateSubtotal(Invoice invoice) {
        if (invoice.getItems() == null || invoice.getItems().isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        return invoice.getItems().stream()
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
    
    default BigDecimal calculateTaxAmount(Invoice invoice) {
        BigDecimal subtotal = calculateSubtotal(invoice);
        
        if (invoice.getTax() != null && invoice.getTax().compareTo(BigDecimal.ZERO) > 0) {
            return invoice.getTax();
        }
        
        return BigDecimal.ZERO;
    }
    
    default BigDecimal calculateTotal(Invoice invoice) {
        if (invoice.getTotal() != null) {
            return invoice.getTotal();
        }
        return calculateSubtotal(invoice).add(calculateTaxAmount(invoice));
    }
    
    default Boolean isOverdue(Invoice invoice) {
        if (invoice.getStatus() == com.crm.entity.enums.InvoiceStatus.PAID) {
            return false;
        }
        return invoice.getDueDate() != null && invoice.getDueDate().isBefore(LocalDate.now());
    }
}
