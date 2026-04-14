package com.crm.mapper;

import com.crm.dto.request.SupportCaseRequestDTO;
import com.crm.dto.response.SupportCaseResponseDTO;
import com.crm.entity.SupportCase;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SupportCaseMapper {

    @Mapping(target = "companyName", expression = "java(getCompanyName(supportCase))")
    @Mapping(target = "contactName", expression = "java(getContactName(supportCase))")
    @Mapping(target = "ownerName", expression = "java(getOwnerName(supportCase))")
    @Mapping(target = "overdueResponse", expression = "java(supportCase.getOverdueResponse())")
    @Mapping(target = "overdueResolution", expression = "java(supportCase.getOverdueResolution())")
    @Mapping(target = "responseSlaStatus", expression = "java(supportCase.getResponseSlaStatus())")
    @Mapping(target = "resolutionSlaStatus", expression = "java(supportCase.getResolutionSlaStatus())")
    SupportCaseResponseDTO toDto(SupportCase supportCase);

    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "caseNumber", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    SupportCase toEntity(SupportCaseRequestDTO dto);

    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "caseNumber", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(SupportCaseRequestDTO dto, @MappingTarget SupportCase supportCase);

    default String getCompanyName(SupportCase supportCase) {
        return supportCase.getCompany() != null ? supportCase.getCompany().getName() : null;
    }

    default String getContactName(SupportCase supportCase) {
        if (supportCase.getContact() == null) {
            return null;
        }
        return supportCase.getContact().getFirstName() + " " + supportCase.getContact().getLastName();
    }

    default String getOwnerName(SupportCase supportCase) {
        return supportCase.getOwner() != null ? supportCase.getOwner().getFullName() : null;
    }
}
