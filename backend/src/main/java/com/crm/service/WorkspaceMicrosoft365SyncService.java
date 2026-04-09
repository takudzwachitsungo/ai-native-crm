package com.crm.service;

import com.crm.dto.response.IntegrationSyncResultDTO;

public interface WorkspaceMicrosoft365SyncService {

    IntegrationSyncResultDTO syncEmails();

    IntegrationSyncResultDTO syncEvents();

    void runScheduledMaintenance();
}
