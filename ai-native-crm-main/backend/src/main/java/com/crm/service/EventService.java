package com.crm.service;

import com.crm.dto.request.EventFilterDTO;
import com.crm.dto.request.EventRequestDTO;
import com.crm.dto.response.EventResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface EventService {
    
    Page<EventResponseDTO> findAll(Pageable pageable, EventFilterDTO filter);
    
    EventResponseDTO findById(UUID id);
    
    EventResponseDTO create(EventRequestDTO request);
    
    EventResponseDTO update(UUID id, EventRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<EventResponseDTO> findEventsBetween(LocalDateTime startTime, LocalDateTime endTime);
    
    List<EventResponseDTO> findUpcomingEvents(int days);
}
