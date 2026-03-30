package com.crm.mapper;

import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.entity.Deal;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DealMapper {
    
    @Mapping(target = "companyName", expression = "java(getCompanyName(deal))")
    @Mapping(target = "contactName", expression = "java(getContactName(deal))")
    @Mapping(target = "ownerName", expression = "java(getOwnerName(deal))")
    @Mapping(target = "ownerTerritory", expression = "java(getOwnerTerritory(deal))")
    @Mapping(target = "territoryMismatch", expression = "java(hasTerritoryMismatch(deal))")
    @Mapping(target = "weightedValue", expression = "java(deal.getWeightedValue())")
    @Mapping(target = "approvalRequired", expression = "java(isApprovalRequired(deal))")
    @Mapping(target = "approvalRequestedByName", expression = "java(getApprovalRequestedByName(deal))")
    @Mapping(target = "approvedByName", expression = "java(getApprovedByName(deal))")
    @Mapping(target = "rejectedByName", expression = "java(getRejectedByName(deal))")
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

    default String getOwnerName(Deal deal) {
        return deal.getOwner() != null ? deal.getOwner().getFullName() : null;
    }

    default String getOwnerTerritory(Deal deal) {
        return deal.getOwner() != null ? deal.getOwner().getTerritory() : null;
    }

    default Boolean hasTerritoryMismatch(Deal deal) {
        String territory = normalizeTerritory(deal.getTerritory());
        String ownerTerritory = getOwnerTerritory(deal);
        return territory != null && normalizeTerritory(ownerTerritory) != null
                ? !territory.equalsIgnoreCase(normalizeTerritory(ownerTerritory))
                : Boolean.FALSE;
    }

    default boolean isApprovalRequired(Deal deal) {
        if (deal.getStage() == com.crm.entity.enums.DealStage.CLOSED_LOST) {
            return false;
        }
        return (deal.getValue() != null && deal.getValue().compareTo(java.math.BigDecimal.valueOf(100000)) >= 0)
                || deal.getRiskLevel() == com.crm.entity.enums.DealRiskLevel.HIGH;
    }

    default String getApprovalRequestedByName(Deal deal) {
        return deal.getApprovalRequester() != null ? deal.getApprovalRequester().getFullName() : null;
    }

    default String getApprovedByName(Deal deal) {
        return deal.getApprover() != null ? deal.getApprover().getFullName() : null;
    }

    default String getRejectedByName(Deal deal) {
        return deal.getRejector() != null ? deal.getRejector().getFullName() : null;
    }

    default String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }
}
