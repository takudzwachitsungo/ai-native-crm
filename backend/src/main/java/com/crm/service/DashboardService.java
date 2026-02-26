package com.crm.service;

import com.crm.dto.response.DashboardStatsDTO;

public interface DashboardService {
    
    /**
     * Get dashboard statistics
     */
    DashboardStatsDTO getStats();
}
