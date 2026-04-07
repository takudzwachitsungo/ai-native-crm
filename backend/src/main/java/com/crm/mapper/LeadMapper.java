package com.crm.mapper;

import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.entity.Lead;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeadMapper {
    
    @Mapping(target = "ownerName", expression = "java(getOwnerName(lead))")
    @Mapping(target = "ownerTerritory", expression = "java(getOwnerTerritory(lead))")
    @Mapping(target = "territoryMismatch", expression = "java(hasTerritoryMismatch(lead))")
    @Mapping(target = "campaignName", expression = "java(getCampaignName(lead))")
    LeadResponseDTO toDto(Lead lead);
    
    Lead toEntity(LeadRequestDTO dto);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(LeadRequestDTO dto, @MappingTarget Lead lead);
    
    default String getOwnerName(Lead lead) {
        if (lead.getOwner() == null) {
            return null;
        }
        return lead.getOwner().getFullName();
    }

    default String getOwnerTerritory(Lead lead) {
        return lead.getOwner() != null ? lead.getOwner().getTerritory() : null;
    }

    default Boolean hasTerritoryMismatch(Lead lead) {
        String territory = normalizeTerritory(lead.getTerritory());
        String ownerTerritory = normalizeTerritory(getOwnerTerritory(lead));
        return territory != null && ownerTerritory != null
                ? !territory.equalsIgnoreCase(ownerTerritory)
                : Boolean.FALSE;
    }

    default String getCampaignName(Lead lead) {
        return lead.getCampaign() != null ? lead.getCampaign().getName() : null;
    }

    default String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }
}
