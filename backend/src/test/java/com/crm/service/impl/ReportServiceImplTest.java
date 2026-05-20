package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.ReportDateRangeRequestDTO;
import com.crm.dto.request.StandardReportDefinitionRequestDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;
import com.crm.dto.response.StandardReportDefinitionResponseDTO;
import com.crm.entity.StandardReportDefinition;
import com.crm.repository.*;
import com.crm.security.RecordAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock private DealRepository dealRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private ContactRepository contactRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private EventRepository eventRepository;
    @Mock private CampaignRepository campaignRepository;
    @Mock private SupportCaseRepository supportCaseRepository;
    @Mock private QuoteRepository quoteRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository userSessionRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private StandardReportDefinitionRepository standardReportDefinitionRepository;
    @Mock private RecordAccessService recordAccessService;

    private ReportServiceImpl reportService;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        TenantContext.setTenantId(tenantId);
        reportService = new ReportServiceImpl(
                dealRepository,
                leadRepository,
                companyRepository,
                contactRepository,
                taskRepository,
                eventRepository,
                campaignRepository,
                supportCaseRepository,
                quoteRepository,
                invoiceRepository,
                productRepository,
                userRepository,
                userSessionRepository,
                auditLogRepository,
                standardReportDefinitionRepository,
                recordAccessService,
                new ObjectMapper(),
                new SimpleMeterRegistry()
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void getTemplatesReturnsCuratedMetadataForStandardReports() {
        List<ReportTemplateResponseDTO> templates = reportService.getTemplates();

        ReportTemplateResponseDTO pipeline = templates.stream()
                .filter(template -> "sales_pipeline_summary".equals(template.getId()))
                .findFirst()
                .orElseThrow();

        assertTrue(pipeline.getDescription().contains("pipeline coverage"));
        assertTrue(pipeline.getMetrics().contains("pipeline_value"));
        assertTrue(pipeline.getDataRequirements().contains("deals"));
    }

    @Test
    void saveStandardDefinitionPersistsTenantScopedDefinition() {
        when(standardReportDefinitionRepository.save(any(StandardReportDefinition.class)))
                .thenAnswer(invocation -> {
                    StandardReportDefinition definition = invocation.getArgument(0);
                    definition.setId(UUID.randomUUID());
                    definition.setCreatedAt(LocalDateTime.now());
                    definition.setUpdatedAt(LocalDateTime.now());
                    return definition;
                });

        StandardReportDefinitionResponseDTO response = reportService.saveStandardDefinition(
                StandardReportDefinitionRequestDTO.builder()
                        .name("Executive Pipeline")
                        .reportType("sales_pipeline_summary")
                        .reportMode("SUMMARY")
                        .dateRange(ReportDateRangeRequestDTO.builder()
                                .start(LocalDate.of(2026, 3, 1))
                                .end(LocalDate.of(2026, 3, 31))
                                .build())
                        .filters(java.util.Map.of("owner", "Takudzwa Chitsungo"))
                        .build()
        );

        assertEquals("Executive Pipeline", response.getName());
        assertEquals("sales_pipeline_summary", response.getReportType());
        assertEquals("SUMMARY", response.getReportMode());
        assertEquals(LocalDate.of(2026, 3, 1), response.getDateRange().getStart());
        assertFalse(response.getFilters().isEmpty());
    }
}
