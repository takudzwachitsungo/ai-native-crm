package com.crm.service.impl;

import com.crm.dto.response.DashboardStatsDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.service.DashboardService;
import com.crm.service.DealService;
import com.crm.service.LeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {
    
    private final LeadService leadService;
    private final DealService dealService;
    
    @Override
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        log.debug("Calculating dashboard statistics");
        
        // Get lead and deal statistics
        LeadStatsDTO leadStats = leadService.getStatistics();
        DealStatsDTO dealStats = dealService.getStatistics();
        
        return DashboardStatsDTO.builder()
                .totalLeads(leadStats.getTotalLeads())
                .totalDeals(dealStats.getTotalDeals())
                .totalRevenue(dealStats.getWonValueThisMonth() != null ? dealStats.getWonValueThisMonth() : BigDecimal.ZERO)
                .conversionRate(leadStats.getConversionRate() != null ? leadStats.getConversionRate() : 0.0)
                .winRate(dealStats.getWinRate() != null ? dealStats.getWinRate() : 0.0)
                .build();
    }
}
