package com.crm.service;

import com.crm.dto.request.TenantDatabaseSettingsUpdateRequestDTO;
import com.crm.dto.response.TenantDatabaseSettingsResponseDTO;

public interface TenantAdminService {

    TenantDatabaseSettingsResponseDTO getCurrentTenantDatabaseSettings();

    TenantDatabaseSettingsResponseDTO updateCurrentTenantDatabaseSettings(TenantDatabaseSettingsUpdateRequestDTO request);

    TenantDatabaseSettingsResponseDTO validateCurrentTenantDatabaseSettings();

    TenantDatabaseSettingsResponseDTO migrateCurrentTenantToDedicatedDatabase();
}
