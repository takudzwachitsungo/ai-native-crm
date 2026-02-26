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
    ContactResponseDTO toDto(Contact contact);
    
    @Mapping(target = "company", ignore = true)
    Contact toEntity(ContactRequestDTO dto);
    
    @Mapping(target = "company", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ContactRequestDTO dto, @MappingTarget Contact contact);
    
    default UUID getCompanyId(Contact contact) {
        return contact.getCompany() != null ? contact.getCompany().getId() : null;
    }
    
    default String getCompanyName(Contact contact) {
        return contact.getCompany() != null ? contact.getCompany().getName() : null;
    }
}
