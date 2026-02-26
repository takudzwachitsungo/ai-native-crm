package com.crm.mapper;

import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.entity.Lead;
import com.crm.entity.User;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeadMapper {
    
    @Mapping(target = "ownerName", expression = "java(getOwnerName(lead))")
    LeadResponseDTO toDto(Lead lead);
    
    Lead toEntity(LeadRequestDTO dto);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(LeadRequestDTO dto, @MappingTarget Lead lead);
    
    default String getOwnerName(Lead lead) {
        if (lead.getOwnerId() == null) {
            return null;
        }
        // This will be populated by service layer if needed
        return null;
    }
}
