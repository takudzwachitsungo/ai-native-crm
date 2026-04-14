package com.crm.service;

import com.crm.dto.response.IntegrationSyncResultDTO;

public interface WorkspaceGoogleWorkspaceSyncService {

    IntegrationSyncResultDTO syncEmails();

    IntegrationSyncResultDTO syncEvents();

    void runScheduledMaintenance();
}
