package com.crm.mapper;

import com.crm.dto.request.CampaignRequestDTO;
import com.crm.dto.response.CampaignResponseDTO;
import com.crm.entity.Campaign;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CampaignMapper {

    @Mapping(target = "ownerName", expression = "java(getOwnerName(campaign))")
    @Mapping(target = "roiPercent", expression = "java(campaign.getRoiPercent())")
    CampaignResponseDTO toDto(Campaign campaign);

    Campaign toEntity(CampaignRequestDTO dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(CampaignRequestDTO dto, @MappingTarget Campaign campaign);

    default String getOwnerName(Campaign campaign) {
        return campaign.getOwner() != null ? campaign.getOwner().getFullName() : null;
    }
}
