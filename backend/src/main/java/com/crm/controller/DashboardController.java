package com.crm.controller;

import com.crm.dto.response.DashboardStatsDTO;
import com.crm.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard statistics API")
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ROLE_USER', 'ADMIN')")
    @Operation(summary = "Get dashboard statistics", description = "Retrieve overall statistics for the dashboard")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        log.info("Fetching dashboard statistics");
        DashboardStatsDTO stats = dashboardService.getStats();
        return ResponseEntity.ok(stats);
    }
}
