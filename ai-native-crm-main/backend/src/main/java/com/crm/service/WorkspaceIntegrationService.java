package com.crm.service;

import com.crm.dto.request.WorkspaceIntegrationUpdateRequestDTO;
import com.crm.dto.request.WorkspaceIntegrationOAuthExchangeRequestDTO;
import com.crm.dto.response.WorkspaceIntegrationOAuthStartResponseDTO;
import com.crm.dto.response.WorkspaceIntegrationResponseDTO;

import java.util.List;

public interface WorkspaceIntegrationService {

    List<WorkspaceIntegrationResponseDTO> getCurrentTenantIntegrations();

    WorkspaceIntegrationResponseDTO updateCurrentTenantIntegration(String providerKey, WorkspaceIntegrationUpdateRequestDTO request);

    WorkspaceIntegrationOAuthStartResponseDTO startOAuth(String providerKey);

    WorkspaceIntegrationResponseDTO exchangeOAuthCode(String providerKey, WorkspaceIntegrationOAuthExchangeRequestDTO request);

    WorkspaceIntegrationResponseDTO refreshOAuthToken(String providerKey);
}
