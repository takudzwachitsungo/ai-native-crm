package com.crm.service;

import com.crm.dto.request.ContractFilterDTO;
import com.crm.dto.request.ContractRequestDTO;
import com.crm.dto.request.QuoteToContractRequestDTO;
import com.crm.dto.response.ContractResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ContractService {

    Page<ContractResponseDTO> findAll(Pageable pageable, ContractFilterDTO filter);

    ContractResponseDTO findById(UUID id);

    ContractResponseDTO create(ContractRequestDTO request);

    ContractResponseDTO update(UUID id, ContractRequestDTO request);

    void delete(UUID id);

    ContractResponseDTO activate(UUID id);

    ContractResponseDTO markRenewalDue(UUID id);

    ContractResponseDTO generateRenewalInvoice(UUID id, String requestedInvoiceNumber);

    ContractResponseDTO renew(UUID id, String requestedContractNumber);

    ContractResponseDTO terminate(UUID id, String reason);

    ContractResponseDTO convertFromQuote(UUID quoteId, QuoteToContractRequestDTO request);
}
