package com.crm.mapper;

import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.entity.Company;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CompanyMapper {
    
    @Mapping(target = "ownerName", ignore = true)
    @Mapping(target = "contactCount", expression = "java(getContactCount(company))")
    @Mapping(target = "dealCount", expression = "java(getDealCount(company))")
    CompanyResponseDTO toDto(Company company);
    
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "deals", ignore = true)
    Company toEntity(CompanyRequestDTO dto);
    
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "deals", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(CompanyRequestDTO dto, @MappingTarget Company company);
    
    default Long getContactCount(Company company) {
        return company.getContacts() != null ? (long) company.getContacts().size() : 0L;
    }
    
    default Long getDealCount(Company company) {
        return company.getDeals() != null ? (long) company.getDeals().size() : 0L;
    }
}
