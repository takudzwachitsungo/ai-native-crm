package com.crm.service;

import com.crm.dto.request.ContactFilterDTO;
import com.crm.dto.request.ContactRequestDTO;
import com.crm.dto.response.ContactResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ContactService {
    
    Page<ContactResponseDTO> findAll(Pageable pageable, ContactFilterDTO filter);
    
    ContactResponseDTO findById(UUID id);
    
    ContactResponseDTO create(ContactRequestDTO request);
    
    ContactResponseDTO update(UUID id, ContactRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    List<ContactResponseDTO> findByCompany(UUID companyId);
    
    List<ContactResponseDTO> searchContacts(String search);
}
