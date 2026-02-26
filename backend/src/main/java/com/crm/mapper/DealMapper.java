package com.crm.mapper;

import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.entity.Deal;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DealMapper {
    
    @Mapping(target = "companyName", expression = "java(getCompanyName(deal))")
    @Mapping(target = "contactName", expression = "java(getContactName(deal))")
    @Mapping(target = "ownerName", ignore = true)
    @Mapping(target = "weightedValue", expression = "java(deal.getWeightedValue())")
    DealResponseDTO toDto(Deal deal);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    Deal toEntity(DealRequestDTO dto);
    
    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(DealRequestDTO dto, @MappingTarget Deal deal);
    
    default String getCompanyName(Deal deal) {
        return deal.getCompany() != null ? deal.getCompany().getName() : null;
    }
    
    default String getContactName(Deal deal) {
        if (deal.getContact() == null) return null;
        return deal.getContact().getFirstName() + " " + deal.getContact().getLastName();
    }
}
