package com.crm.service;

import com.crm.dto.request.TaskFilterDTO;
import com.crm.dto.request.TaskRequestDTO;
import com.crm.dto.response.TaskResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface TaskService {
    
    Page<TaskResponseDTO> findAll(Pageable pageable, TaskFilterDTO filter);
    
    TaskResponseDTO findById(UUID id);
    
    TaskResponseDTO create(TaskRequestDTO request);
    
    TaskResponseDTO update(UUID id, TaskRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<TaskResponseDTO> findOverdueTasks();
    
    List<TaskResponseDTO> findByAssignedTo(UUID userId);
    
    TaskResponseDTO completeTask(UUID id);
}
