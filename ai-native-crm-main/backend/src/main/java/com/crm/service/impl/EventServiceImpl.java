package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.EventFilterDTO;
import com.crm.dto.request.EventRequestDTO;
import com.crm.dto.response.EventResponseDTO;
import com.crm.entity.Event;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.EventMapper;
import com.crm.repository.EventRepository;
import com.crm.repository.UserRepository;
import com.crm.service.EventService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventMapper eventMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<EventResponseDTO> findAll(Pageable pageable, EventFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Event>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), search),
                    cb.like(cb.lower(root.get("description")), search),
                    cb.like(cb.lower(root.get("location")), search)
                ));
            }
            
            if (filter.getEventType() != null) {
                specs.add(SpecificationBuilder.equal("eventType", filter.getEventType()));
            }
            
            if (filter.getOrganizerId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("organizer").get("id"), filter.getOrganizerId()));
            }
            
            if (filter.getStartTimeFrom() != null && filter.getStartTimeTo() != null) {
                specs.add(SpecificationBuilder.between("startTime", filter.getStartTimeFrom(), filter.getStartTimeTo()));
            }
            
            if (filter.getRelatedEntityType() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityType", filter.getRelatedEntityType()));
            }
            
            if (filter.getRelatedEntityId() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityId", filter.getRelatedEntityId()));
            }
        }
        
        Specification<Event> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Event> events = eventRepository.findAll(spec, pageable);
        
        return events.map(eventMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "events", key = "#id")
    public EventResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Event event = eventRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Event", id));
        
        return eventMapper.toDto(event);
    }

    @Override
    @Transactional
    @CacheEvict(value = "events", allEntries = true)
    public EventResponseDTO create(EventRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        // Validate time range
        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        
        Event event = eventMapper.toEntity(request);
        event.setTenantId(tenantId);
        
        // Event organizer tracking not implemented in current entity
        
        event = eventRepository.save(event);
        log.info("Created event: {} for tenant: {}", event.getId(), tenantId);
        
        return eventMapper.toDto(event);
    }

    @Override
    @Transactional
    @CacheEvict(value = "events", allEntries = true)
    public EventResponseDTO update(UUID id, EventRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Event event = eventRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Event", id));
        
        // Validate time range
        if (request.getEndTime() != null && request.getStartTime() != null &&
                request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        
        eventMapper.updateEntity(request, event);
        event = eventRepository.save(event);
        
        log.info("Updated event: {} for tenant: {}", id, tenantId);
        
        return eventMapper.toDto(event);
    }

    @Override
    @Transactional
    @CacheEvict(value = "events", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Event event = eventRepository.findById(id)
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Event", id));
        
        event.setArchived(true);
        eventRepository.save(event);
        
        log.info("Deleted (archived) event: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "events", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Event> events = eventRepository.findAllById(ids).stream()
                .filter(e -> e.getTenantId().equals(tenantId) && !e.getArchived())
                .collect(Collectors.toList());
        
        if (events.isEmpty()) {
            throw new BadRequestException("No valid events found for deletion");
        }
        
        events.forEach(event -> event.setArchived(true));
        eventRepository.saveAll(events);
        
        log.info("Bulk deleted {} events for tenant: {}", events.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventResponseDTO> findEventsBetween(LocalDateTime startTime, LocalDateTime endTime) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Event> events = eventRepository.findEventsBetween(tenantId, startTime, endTime);
        return events.stream()
                .map(eventMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventResponseDTO> findUpcomingEvents(int days) {
        UUID tenantId = TenantContext.getTenantId();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endDate = now.plusDays(days);
        
        return findEventsBetween(now, endDate);
    }
}
