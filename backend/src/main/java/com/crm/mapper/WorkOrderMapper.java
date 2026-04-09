package com.crm.mapper;

import com.crm.dto.request.WorkOrderRequestDTO;
import com.crm.dto.response.WorkOrderResponseDTO;
import com.crm.entity.WorkOrder;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface WorkOrderMapper {

    @Mapping(target = "companyName", expression = "java(getCompanyName(workOrder))")
    @Mapping(target = "contactName", expression = "java(getContactName(workOrder))")
    @Mapping(target = "supportCaseNumber", expression = "java(getSupportCaseNumber(workOrder))")
    @Mapping(target = "assignedTechnicianName", expression = "java(getTechnicianName(workOrder))")
    WorkOrderResponseDTO toDto(WorkOrder workOrder);

    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "supportCase", ignore = true)
    @Mapping(target = "assignedTechnician", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "dispatchedAt", ignore = true)
    @Mapping(target = "startedAt", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "completionNotes", ignore = true)
    WorkOrder toEntity(WorkOrderRequestDTO dto);

    @Mapping(target = "company", ignore = true)
    @Mapping(target = "contact", ignore = true)
    @Mapping(target = "supportCase", ignore = true)
    @Mapping(target = "assignedTechnician", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "dispatchedAt", ignore = true)
    @Mapping(target = "startedAt", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "completionNotes", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(WorkOrderRequestDTO dto, @MappingTarget WorkOrder workOrder);

    default String getCompanyName(WorkOrder workOrder) {
        return workOrder.getCompany() != null ? workOrder.getCompany().getName() : null;
    }

    default String getContactName(WorkOrder workOrder) {
        if (workOrder.getContact() == null) {
            return null;
        }
        return workOrder.getContact().getFirstName() + " " + workOrder.getContact().getLastName();
    }

    default String getSupportCaseNumber(WorkOrder workOrder) {
        return workOrder.getSupportCase() != null ? workOrder.getSupportCase().getCaseNumber() : null;
    }

    default String getTechnicianName(WorkOrder workOrder) {
        return workOrder.getAssignedTechnician() != null ? workOrder.getAssignedTechnician().getFullName() : null;
    }
}
