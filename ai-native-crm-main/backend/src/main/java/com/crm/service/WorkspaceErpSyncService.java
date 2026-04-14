package com.crm.service;

import com.crm.dto.response.IntegrationSyncResultDTO;

import java.util.UUID;

public interface WorkspaceErpSyncService {

    IntegrationSyncResultDTO exportCompany(UUID companyId, String providerKey);

    IntegrationSyncResultDTO exportInvoice(UUID invoiceId, String providerKey);
}
