package com.crm.mapper;

import com.crm.dto.request.EventRequestDTO;
import com.crm.dto.response.EventResponseDTO;
import com.crm.entity.Event;
import org.mapstruct.*;

import java.time.Duration;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EventMapper {
    
    @Mapping(target = "durationMinutes", expression = "java(calculateDuration(event))")
    @Mapping(source = "startDateTime", target = "startTime")
    @Mapping(source = "endDateTime", target = "endTime")
    EventResponseDTO toDto(Event event);
    
    @Mapping(source = "startTime", target = "startDateTime")
    @Mapping(source = "endTime", target = "endDateTime")
    Event toEntity(EventRequestDTO dto);
    
    @Mapping(source = "startTime", target = "startDateTime")
    @Mapping(source = "endTime", target = "endDateTime")
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(EventRequestDTO dto, @MappingTarget Event event);
    
    default Long calculateDuration(Event event) {
        if (event.getStartDateTime() == null || event.getEndDateTime() == null) {
            return null;
        }
        return Duration.between(event.getStartDateTime(), event.getEndDateTime()).toMinutes();
    }
}
