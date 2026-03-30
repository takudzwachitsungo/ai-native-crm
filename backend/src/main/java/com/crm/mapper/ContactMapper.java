package com.crm.mapper;

import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.response.ContactResponseDTO;
import com.crm.entity.Contact;
import org.mapstruct.*;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ContactMapper {
    
    @Mapping(target = "companyId", expression = "java(getCompanyId(contact))")
    @Mapping(target = "companyName", expression = "java(getCompanyName(contact))")
    @Mapping(target = "reportsToId", expression = "java(getReportsToId(contact))")
    @Mapping(target = "reportsToName", expression = "java(getReportsToName(contact))")
    ContactResponseDTO toDto(Contact contact);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "reportsTo", ignore = true)
    Contact toEntity(ContactRequestDTO dto);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "reportsTo", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ContactRequestDTO dto, @MappingTarget Contact contact);
    
    default UUID getCompanyId(Contact contact) {
        return contact.getCompany() != null ? contact.getCompany().getId() : null;
    }
    
    default String getCompanyName(Contact contact) {
        return contact.getCompany() != null ? contact.getCompany().getName() : null;
    }

    default UUID getReportsToId(Contact contact) {
        return contact.getReportsTo() != null ? contact.getReportsTo().getId() : contact.getReportsToId();
    }

    default String getReportsToName(Contact contact) {
        return contact.getReportsTo() != null ? contact.getReportsTo().getFullName() : null;
    }
}
