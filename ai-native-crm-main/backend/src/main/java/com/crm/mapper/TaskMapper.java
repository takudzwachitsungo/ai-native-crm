package com.crm.mapper;

import com.crm.dto.request.TaskRequestDTO;
import com.crm.dto.response.TaskResponseDTO;
import com.crm.entity.Task;
import org.mapstruct.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TaskMapper {
    
    @Mapping(target = "assignedToName", expression = "java(getAssignedToName(task))")
    @Mapping(target = "isOverdue", expression = "java(isOverdue(task))")
    @Mapping(target = "dueDate", source = "dueDate", qualifiedByName = "localDateToLocalDateTime")
    TaskResponseDTO toDto(Task task);
    
    @Mapping(target = "assignee", ignore = true)
    @Mapping(target = "dueDate", source = "dueDate", qualifiedByName = "localDateTimeToLocalDate")
    Task toEntity(TaskRequestDTO dto);
    
    @Mapping(target = "assignee", ignore = true)
    @Mapping(target = "dueDate", source = "dueDate", qualifiedByName = "localDateTimeToLocalDate")
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(TaskRequestDTO dto, @MappingTarget Task task);
    
    @Named("localDateTimeToLocalDate")
    default LocalDate localDateTimeToLocalDate(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.toLocalDate() : null;
    }
    
    @Named("localDateToLocalDateTime")
    default LocalDateTime localDateToLocalDateTime(LocalDate date) {
        return date != null ? date.atStartOfDay() : null;
    }
    
    default String getAssignedToName(Task task) {
        if (task.getAssignee() == null) {
            return null;
        }
        return task.getAssignee().getFirstName() + " " + task.getAssignee().getLastName();
    }
    
    default Boolean isOverdue(Task task) {
        if (task.getStatus() == com.crm.entity.enums.TaskStatus.COMPLETED) {
            return false;
        }
        return task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now());
    }
}
