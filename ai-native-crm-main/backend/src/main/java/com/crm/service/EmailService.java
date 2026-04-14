package com.crm.service;

import com.crm.dto.request.EmailFilterDTO;
import com.crm.dto.request.EmailRequestDTO;
import com.crm.dto.response.EmailResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface EmailService {
    
    Page<EmailResponseDTO> findAll(Pageable pageable, EmailFilterDTO filter);
    
    EmailResponseDTO findById(UUID id);
    
    EmailResponseDTO create(EmailRequestDTO request);
    
    EmailResponseDTO update(UUID id, EmailRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    EmailResponseDTO sendEmail(UUID id);
    
    EmailResponseDTO markAsRead(UUID id);
    
    EmailResponseDTO markAsUnread(UUID id);
    
    EmailResponseDTO moveToFolder(UUID id, String folderName);
}
