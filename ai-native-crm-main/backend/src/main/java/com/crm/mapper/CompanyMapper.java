package com.crm.mapper;

import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.entity.Company;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CompanyMapper {
    
    @Mapping(target = "ownerName", expression = "java(getOwnerName(company))")
    @Mapping(target = "ownerTerritory", expression = "java(getOwnerTerritory(company))")
    @Mapping(target = "territoryMismatch", expression = "java(hasTerritoryMismatch(company))")
    @Mapping(target = "parentCompanyId", expression = "java(getParentCompanyId(company))")
    @Mapping(target = "parentCompanyName", expression = "java(getParentCompanyName(company))")
    @Mapping(target = "contactCount", expression = "java(getContactCount(company))")
    @Mapping(target = "dealCount", expression = "java(getDealCount(company))")
    @Mapping(target = "childCompanyCount", expression = "java(getChildCompanyCount(company))")
    CompanyResponseDTO toDto(Company company);
    
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "deals", ignore = true)
    @Mapping(target = "parentCompany", ignore = true)
    @Mapping(target = "childCompanies", ignore = true)
    Company toEntity(CompanyRequestDTO dto);
    
    @Mapping(target = "contacts", ignore = true)
    @Mapping(target = "deals", ignore = true)
    @Mapping(target = "parentCompany", ignore = true)
    @Mapping(target = "childCompanies", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(CompanyRequestDTO dto, @MappingTarget Company company);
    
    default Long getContactCount(Company company) {
        return company.getContacts() != null ? (long) company.getContacts().size() : 0L;
    }
    
    default Long getDealCount(Company company) {
        return company.getDeals() != null ? (long) company.getDeals().size() : 0L;
    }

    default Long getChildCompanyCount(Company company) {
        return company.getChildCompanies() != null ? (long) company.getChildCompanies().size() : 0L;
    }

    default String getOwnerName(Company company) {
        return company.getOwner() != null ? company.getOwner().getFullName() : null;
    }

    default String getOwnerTerritory(Company company) {
        return company.getOwner() != null ? company.getOwner().getTerritory() : null;
    }

    default Boolean hasTerritoryMismatch(Company company) {
        String territory = normalizeTerritory(company.getTerritory());
        String ownerTerritory = getOwnerTerritory(company);
        return territory != null && normalizeTerritory(ownerTerritory) != null
                ? !territory.equalsIgnoreCase(normalizeTerritory(ownerTerritory))
                : Boolean.FALSE;
    }

    default java.util.UUID getParentCompanyId(Company company) {
        return company.getParentCompany() != null ? company.getParentCompany().getId() : company.getParentCompanyId();
    }

    default String getParentCompanyName(Company company) {
        return company.getParentCompany() != null ? company.getParentCompany().getName() : null;
    }

    default String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }
}
