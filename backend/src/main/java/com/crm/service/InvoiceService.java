package com.crm.service;

import com.crm.dto.request.InvoiceFilterDTO;
import com.crm.dto.request.InvoiceRequestDTO;
import com.crm.dto.response.InvoiceResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface InvoiceService {
    
    Page<InvoiceResponseDTO> findAll(Pageable pageable, InvoiceFilterDTO filter);
    
    InvoiceResponseDTO findById(UUID id);
    
    InvoiceResponseDTO create(InvoiceRequestDTO request);
    
    InvoiceResponseDTO update(UUID id, InvoiceRequestDTO request);
    
    void delete(UUID id);
    
    void bulkDelete(List<UUID> ids);
    
    InvoiceResponseDTO updateStatus(UUID id, String status);
    
    InvoiceResponseDTO markAsPaid(UUID id, LocalDate paidDate);
    
    List<InvoiceResponseDTO> findOverdueInvoices();
}
