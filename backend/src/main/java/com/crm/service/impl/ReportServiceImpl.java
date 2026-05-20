package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.ReportDateRangeRequestDTO;
import com.crm.dto.request.ReportGenerateRequestDTO;
import com.crm.dto.request.StandardReportDefinitionRequestDTO;
import com.crm.dto.response.GeneratedReportResponseDTO;
import com.crm.dto.response.ReportSectionResponseDTO;
import com.crm.dto.response.ReportTemplateResponseDTO;
import com.crm.dto.response.StandardReportDefinitionResponseDTO;
import com.crm.entity.*;
import com.crm.entity.enums.*;
import com.crm.exception.BadRequestException;
import com.crm.repository.*;
import com.crm.security.RecordAccessService;
import com.crm.service.ReportService;
import com.crm.util.SpecificationBuilder;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private static final String MODE_SUMMARY = "SUMMARY";
    private static final String MODE_TABULAR = "TABULAR";
    private static final String MODE_MATRIX = "MATRIX";
    private static final Set<String> SUPPORTED_MODES = Set.of(MODE_SUMMARY, MODE_TABULAR, MODE_MATRIX);
    private static final Map<String, TemplateMetadata> TEMPLATE_METADATA = buildTemplateMetadata();

    private final DealRepository dealRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final TaskRepository taskRepository;
    private final EventRepository eventRepository;
    private final CampaignRepository campaignRepository;
    private final SupportCaseRepository supportCaseRepository;
    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final AuditLogRepository auditLogRepository;
    private final StandardReportDefinitionRepository standardReportDefinitionRepository;
    private final RecordAccessService recordAccessService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    private static final List<TemplateDefinition> TEMPLATES = List.of(
            t("sales_pipeline_summary", "Executive / Overview", "Sales Pipeline Summary"),
            t("revenue_summary_report", "Executive / Overview", "Revenue Summary Report"),
            t("deals_closing_this_month", "Executive / Overview", "Deals Closing This Month"),
            t("deals_lost_this_month", "Executive / Overview", "Deals Lost This Month"),
            t("sales_trend_report", "Executive / Overview", "Sales Trend Report"),
            t("forecast_summary_report", "Executive / Overview", "Forecast Summary Report"),

            t("deals_by_stage", "Deals", "Deals by Stage"),
            t("deals_by_owner", "Deals", "Deals by Owner (Sales Rep)"),
            t("deals_by_closing_date", "Deals", "Deals by Closing Date"),
            t("won_deals_report", "Deals", "Won Deals Report"),
            t("lost_deals_report", "Deals", "Lost Deals Report"),
            t("deals_by_type", "Deals", "Deals by Type"),
            t("deals_by_industry", "Deals", "Deals by Industry"),
            t("deals_by_lead_source", "Deals", "Deals by Lead Source"),
            t("pipeline_value_report", "Deals", "Pipeline Value Report"),

            t("leads_by_source", "Leads", "Leads by Source"),
            t("leads_by_status", "Leads", "Leads by Status"),
            t("leads_by_industry", "Leads", "Leads by Industry"),
            t("leads_converted_report", "Leads", "Leads Converted Report"),
            t("leads_not_contacted", "Leads", "Leads Not Contacted"),
            t("leads_by_owner", "Leads", "Leads by Owner"),
            t("leads_created_over_time", "Leads", "Leads Created Over Time"),

            t("lead_to_deal_conversion_report", "Conversion", "Lead to Deal Conversion Report"),
            t("lead_conversion_funnel", "Conversion", "Lead Conversion Funnel"),
            t("conversion_by_source", "Conversion", "Conversion by Source"),
            t("conversion_by_sales_rep", "Conversion", "Conversion by Sales Rep"),

            t("activities_by_type", "Activity", "Activities by Type"),
            t("activities_by_user", "Activity", "Activities by User"),
            t("calls_made_report", "Activity", "Calls Made Report"),
            t("meetings_scheduled_report", "Activity", "Meetings Scheduled Report"),
            t("tasks_completed_report", "Activity", "Tasks Completed"),
            t("overdue_activities", "Activity", "Overdue Activities"),
            t("last_activity_by_record", "Activity", "Last Activity by Record"),

            t("accounts_by_industry", "Accounts & Contacts", "Accounts by Industry"),
            t("accounts_by_owner", "Accounts & Contacts", "Accounts by Owner"),
            t("contacts_by_source", "Accounts & Contacts", "Contacts by Source"),
            t("contacts_created_over_time", "Accounts & Contacts", "Contacts Created Over Time"),
            t("contact_activity_report", "Accounts & Contacts", "Contact Activity Report"),

            t("campaign_roi_report", "Campaign / Marketing", "Campaign ROI Report"),
            t("leads_by_campaign", "Campaign / Marketing", "Leads by Campaign"),
            t("campaign_revenue_report", "Campaign / Marketing", "Campaign Revenue Report"),
            t("campaign_status_report", "Campaign / Marketing", "Campaign Status Report"),
            t("email_campaign_performance", "Campaign / Marketing", "Email Campaign Performance"),

            t("products_by_revenue", "Product & Sales Inventory", "Products by Revenue"),
            t("products_sold_report", "Product & Sales Inventory", "Products Sold Report"),
            t("quotes_report", "Product & Sales Inventory", "Quotes Report"),
            t("sales_orders_report", "Product & Sales Inventory", "Sales Orders Report"),
            t("invoices_report", "Product & Sales Inventory", "Invoices Report"),
            t("purchase_orders_report", "Product & Sales Inventory", "Purchase Orders Report"),

            t("sales_forecast_by_user", "Forecast", "Sales Forecast by User"),
            t("sales_forecast_by_territory", "Forecast", "Sales Forecast by Territory"),
            t("forecast_vs_actual", "Forecast", "Forecast vs Actual"),
            t("quota_vs_achievement", "Forecast", "Quota vs Achievement"),

            t("cases_by_status", "Cases / Support", "Cases by Status"),
            t("cases_by_priority", "Cases / Support", "Cases by Priority"),
            t("cases_by_owner", "Cases / Support", "Cases by Owner"),
            t("open_vs_closed_cases", "Cases / Support", "Open vs Closed Cases"),
            t("cases_by_category", "Cases / Support", "Cases by Category"),
            t("escalated_cases", "Cases / Support", "Escalated Cases"),

            t("sales_by_territory", "Territory / Performance", "Sales by Territory"),
            t("performance_by_sales_rep", "Territory / Performance", "Performance by Sales Rep"),
            t("revenue_by_region", "Territory / Performance", "Revenue by Region"),
            t("deals_by_territory", "Territory / Performance", "Deals by Territory"),

            t("user_activity_report", "System / Admin", "User Activity Report"),
            t("login_history_report", "System / Admin", "Login History"),
            t("record_modification_report", "System / Admin", "Record Modification Report"),
            t("audit_log_report", "System / Admin", "Audit Log Report")
    );

    @Override
    public List<ReportTemplateResponseDTO> getTemplates() {
        return TEMPLATES.stream()
                .map(def -> {
                    TemplateMetadata metadata = TEMPLATE_METADATA.getOrDefault(
                            def.id,
                            new TemplateMetadata(
                                    def.title + " generated from backend CRM data.",
                                    List.of("crm-data"),
                                    List.of("count", "value")
                            )
                    );
                    return ReportTemplateResponseDTO.builder()
                        .id(def.id)
                        .category(def.category)
                        .title(def.title)
                        .description(metadata.description())
                        .dataRequirements(metadata.dataRequirements())
                        .metrics(metadata.metrics())
                        .displayModes(List.of(MODE_SUMMARY, MODE_TABULAR, MODE_MATRIX))
                        .defaultMode(MODE_SUMMARY)
                        .build();
                })
                .toList();
    }

    private static Map<String, TemplateMetadata> buildTemplateMetadata() {
        Map<String, TemplateMetadata> metadata = new HashMap<>();

        metadata.put("sales_pipeline_summary", m("Executive pipeline coverage by stage, weighted value, and close confidence.", List.of("deals", "pipeline"), List.of("pipeline_value", "weighted_value", "deal_count")));
        metadata.put("revenue_summary_report", m("Revenue performance across won deals, open pipeline, and expected close windows.", List.of("deals", "revenue"), List.of("closed_revenue", "open_pipeline", "avg_deal_size")));
        metadata.put("deals_closing_this_month", m("Deals expected to close in the current month with owner, company, and expected value detail.", List.of("deals", "closing_date"), List.of("deal_count", "closing_value", "owner_mix")));
        metadata.put("deals_lost_this_month", m("Lost opportunities in the current month, including loss reason and owner impact.", List.of("deals", "loss_reason"), List.of("lost_deal_count", "lost_value", "loss_reason")));
        metadata.put("sales_trend_report", m("Revenue and deal movement over time for trend analysis and executive reviews.", List.of("deals", "date_range"), List.of("trend_value", "trend_count", "close_rate")));
        metadata.put("forecast_summary_report", m("Forecast rollup across quota, pipeline, and expected attainment for the selected period.", List.of("forecast", "quota"), List.of("forecast", "quota", "attainment")));

        metadata.put("deals_by_stage", m("Pipeline distribution grouped by stage to show coverage and concentration.", List.of("deals", "stage"), List.of("deal_count", "pipeline_value")));
        metadata.put("deals_by_owner", m("Deal ownership distribution across sales reps and managers.", List.of("deals", "owner"), List.of("deal_count", "pipeline_value", "avg_value")));
        metadata.put("deals_by_closing_date", m("Upcoming close distribution by expected closing period.", List.of("deals", "closing_date"), List.of("deal_count", "pipeline_value")));
        metadata.put("won_deals_report", m("Closed-won deals with company, owner, region, and revenue detail.", List.of("deals", "closed_won"), List.of("won_count", "won_revenue")));
        metadata.put("lost_deals_report", m("Closed-lost opportunities with owner, company, and loss context.", List.of("deals", "closed_lost"), List.of("lost_count", "lost_value")));
        metadata.put("deals_by_type", m("Opportunity mix grouped by deal type.", List.of("deals", "deal_type"), List.of("deal_count", "pipeline_value")));
        metadata.put("deals_by_industry", m("Opportunity distribution by customer industry.", List.of("deals", "companies"), List.of("deal_count", "pipeline_value")));
        metadata.put("deals_by_lead_source", m("Pipeline grouped by originating lead source.", List.of("deals", "lead_source"), List.of("deal_count", "pipeline_value")));
        metadata.put("pipeline_value_report", m("Open pipeline value by stage with weighted revenue visibility.", List.of("deals", "pipeline"), List.of("pipeline_value", "weighted_value")));

        metadata.put("leads_by_source", m("Lead acquisition mix grouped by source.", List.of("leads", "source"), List.of("lead_count", "conversion_rate")));
        metadata.put("leads_by_status", m("Lead lifecycle distribution by status.", List.of("leads", "status"), List.of("lead_count", "status_mix")));
        metadata.put("leads_by_industry", m("Lead volume by customer industry.", List.of("leads", "industry"), List.of("lead_count", "estimated_value")));
        metadata.put("leads_converted_report", m("Converted leads with owner, company, and timing detail.", List.of("leads", "conversion"), List.of("converted_count", "conversion_rate")));
        metadata.put("leads_not_contacted", m("Leads without a recorded contact touchpoint.", List.of("leads", "activity"), List.of("uncontacted_count", "aging")));
        metadata.put("leads_by_owner", m("Lead portfolio grouped by assigned owner.", List.of("leads", "owner"), List.of("lead_count", "conversion_rate")));
        metadata.put("leads_created_over_time", m("Lead creation trend over time.", List.of("leads", "created_at"), List.of("lead_count", "trend")));

        metadata.put("lead_to_deal_conversion_report", m("Lead-to-deal conversion outcomes across the selected period.", List.of("leads", "deals"), List.of("lead_count", "converted_count", "conversion_rate")));
        metadata.put("lead_conversion_funnel", m("Top-of-funnel to conversion funnel progression.", List.of("leads", "funnel"), List.of("new_leads", "qualified", "converted")));
        metadata.put("conversion_by_source", m("Conversion performance grouped by lead source.", List.of("leads", "source"), List.of("conversion_rate", "converted_count")));
        metadata.put("conversion_by_sales_rep", m("Conversion performance grouped by owner.", List.of("leads", "owner"), List.of("conversion_rate", "converted_count")));

        metadata.put("activities_by_type", m("Logged activity volume by type across calls, meetings, and tasks.", List.of("events", "tasks"), List.of("activity_count", "activity_mix")));
        metadata.put("activities_by_user", m("Team productivity grouped by user.", List.of("events", "tasks", "users"), List.of("activity_count", "completion_rate")));
        metadata.put("calls_made_report", m("Completed call activity in the selected period.", List.of("events", "calls"), List.of("call_count", "owner_mix")));
        metadata.put("meetings_scheduled_report", m("Scheduled meeting activity for the selected period.", List.of("events", "meetings"), List.of("meeting_count", "owner_mix")));
        metadata.put("tasks_completed_report", m("Completed task output by user and record context.", List.of("tasks", "completion"), List.of("completed_count", "owner_mix")));
        metadata.put("overdue_activities", m("Open tasks and activities that are now overdue.", List.of("tasks", "due_date"), List.of("overdue_count", "aging")));
        metadata.put("last_activity_by_record", m("Most recent recorded activity per related CRM record.", List.of("events", "tasks", "records"), List.of("last_touch")));

        metadata.put("accounts_by_industry", m("Account distribution by industry.", List.of("companies", "industry"), List.of("account_count", "revenue")));
        metadata.put("accounts_by_owner", m("Account portfolio grouped by owner.", List.of("companies", "owner"), List.of("account_count", "revenue")));
        metadata.put("contacts_by_source", m("Contact creation source mix.", List.of("contacts", "source"), List.of("contact_count")));
        metadata.put("contacts_created_over_time", m("Contact creation trend over time.", List.of("contacts", "created_at"), List.of("contact_count", "trend")));
        metadata.put("contact_activity_report", m("Engagement coverage across contacts and related activities.", List.of("contacts", "events", "tasks"), List.of("activity_count", "contact_coverage")));

        metadata.put("campaign_roi_report", m("Campaign return on investment based on attributed revenue and campaign spend.", List.of("campaigns", "leads", "deals"), List.of("roi", "revenue", "lead_count")));
        metadata.put("leads_by_campaign", m("Lead acquisition grouped by campaign.", List.of("campaigns", "leads"), List.of("lead_count", "conversion_rate")));
        metadata.put("campaign_revenue_report", m("Revenue attributed back to campaigns.", List.of("campaigns", "deals"), List.of("attributed_revenue", "won_deals")));
        metadata.put("campaign_status_report", m("Campaign distribution by current status.", List.of("campaigns", "status"), List.of("campaign_count")));
        metadata.put("email_campaign_performance", m("Email campaign engagement and outcome performance.", List.of("campaigns", "email_metrics"), List.of("open_rate", "click_rate", "conversion_rate")));

        metadata.put("products_by_revenue", m("Top-performing products by booked revenue.", List.of("products", "quotes", "invoices"), List.of("revenue", "units")));
        metadata.put("products_sold_report", m("Products sold by volume and revenue.", List.of("products", "quotes", "invoices"), List.of("units", "revenue")));
        metadata.put("quotes_report", m("Quotes issued, expiry status, and quote value detail.", List.of("quotes", "customers"), List.of("quote_count", "quote_value")));
        metadata.put("sales_orders_report", m("Reserved for future sales-order reporting once the module is modeled.", List.of("sales_orders"), List.of("order_count")));
        metadata.put("invoices_report", m("Invoice issuance, due dates, and payment coverage.", List.of("invoices", "customers"), List.of("invoice_count", "invoice_total", "outstanding")));
        metadata.put("purchase_orders_report", m("Reserved for future purchase-order reporting once the module is modeled.", List.of("purchase_orders"), List.of("order_count")));

        metadata.put("sales_forecast_by_user", m("Forecast rollup grouped by owner.", List.of("forecast", "users"), List.of("forecast", "quota", "attainment")));
        metadata.put("sales_forecast_by_territory", m("Forecast rollup grouped by territory.", List.of("forecast", "territories"), List.of("forecast", "quota", "attainment")));
        metadata.put("forecast_vs_actual", m("Forecast compared with actual closed performance.", List.of("forecast", "deals"), List.of("forecast", "actual", "variance")));
        metadata.put("quota_vs_achievement", m("Quota attainment across owners or teams.", List.of("quota", "deals", "users"), List.of("quota", "achievement", "attainment")));

        metadata.put("cases_by_status", m("Support case volume grouped by status.", List.of("cases", "status"), List.of("case_count", "sla_breach_count")));
        metadata.put("cases_by_priority", m("Support case volume grouped by priority.", List.of("cases", "priority"), List.of("case_count", "breach_count")));
        metadata.put("cases_by_owner", m("Support workload grouped by owner.", List.of("cases", "owner"), List.of("case_count", "active_cases")));
        metadata.put("open_vs_closed_cases", m("Open and closed support case comparison.", List.of("cases", "status"), List.of("open_cases", "closed_cases")));
        metadata.put("cases_by_category", m("Support cases grouped by type or category.", List.of("cases", "category"), List.of("case_count")));
        metadata.put("escalated_cases", m("Escalated or SLA-breached cases requiring urgent review.", List.of("cases", "sla", "status"), List.of("escalated_cases", "breached_cases")));

        metadata.put("sales_by_territory", m("Closed-won revenue grouped by territory.", List.of("deals", "territories"), List.of("won_revenue", "deal_count")));
        metadata.put("performance_by_sales_rep", m("Sales performance grouped by rep with won revenue and attainment signals.", List.of("deals", "users"), List.of("won_revenue", "pipeline_value", "win_rate")));
        metadata.put("revenue_by_region", m("Closed-won revenue grouped by customer region.", List.of("deals", "companies"), List.of("won_revenue", "deal_count")));
        metadata.put("deals_by_territory", m("Pipeline and deal counts grouped by territory.", List.of("deals", "territories"), List.of("deal_count", "pipeline_value")));

        metadata.put("user_activity_report", m("User-level platform and CRM activity summary.", List.of("users", "events", "tasks"), List.of("activity_count", "last_seen")));
        metadata.put("login_history_report", m("Recent authenticated sessions and login events.", List.of("users", "sessions"), List.of("login_count", "last_login")));
        metadata.put("record_modification_report", m("Record update activity across key CRM modules.", List.of("audit", "records"), List.of("modification_count", "module_mix")));
        metadata.put("audit_log_report", m("Audit log entries for sensitive or important platform actions.", List.of("audit_logs"), List.of("audit_event_count")));

        return metadata;
    }

    private static TemplateMetadata m(String description, List<String> dataRequirements, List<String> metrics) {
        return new TemplateMetadata(description, dataRequirements, metrics);
    }

    private record TemplateMetadata(String description, List<String> dataRequirements, List<String> metrics) {}

    @Override
    @Transactional(readOnly = true)
    public GeneratedReportResponseDTO generateReport(ReportGenerateRequestDTO request) {
        Timer.Sample sample = Timer.start(meterRegistry);
        String reportType = normalize(request.getReportType());
        try {
            GeneratedReportResponseDTO report = generateStandardReportInternal(request);
            meterRegistry.counter("crm.reports.generate.total", "report_type", reportType, "result", "success").increment();
            return report;
        } catch (RuntimeException exception) {
            meterRegistry.counter("crm.reports.generate.total", "report_type", reportType, "result", "failure").increment();
            throw exception;
        } finally {
            sample.stop(meterRegistry.timer("crm.reports.generate.duration", "report_type", reportType));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportReportPdf(ReportGenerateRequestDTO request) {
        GeneratedReportResponseDTO report = generateReport(request);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDocument = new PdfDocument(writer);
            Document document = new Document(pdfDocument);

            PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

            document.add(new Paragraph(report.getTitle())
                    .setFont(bold)
                    .setFontSize(18)
                    .setMarginBottom(4));
            document.add(new Paragraph(report.getSummary())
                    .setFont(regular)
                    .setFontSize(11)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setMarginBottom(10));
            document.add(new Paragraph(String.format(
                    "Generated %s | Range %s to %s | Mode %s",
                    report.getGeneratedAt(),
                    report.getDateRange() != null ? report.getDateRange().getStart() : null,
                    report.getDateRange() != null ? report.getDateRange().getEnd() : null,
                    report.getReportMode()
            )).setFontSize(9).setFontColor(ColorConstants.GRAY).setMarginBottom(16));

            addMetricsTable(document, report.getMetrics(), bold, regular);

            if (report.getSections() != null) {
                for (ReportSectionResponseDTO section : report.getSections()) {
                    if ("metrics".equalsIgnoreCase(section.getType())) {
                        continue;
                    }
                    document.add(new Paragraph(section.getTitle())
                            .setFont(bold)
                            .setFontSize(13)
                            .setMarginTop(14)
                            .setMarginBottom(8));
                    renderPdfSection(document, section, bold, regular);
                }
            }

            document.close();
            return outputStream.toByteArray();
        } catch (Exception exception) {
            throw new BadRequestException("Unable to export report PDF: " + exception.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportReportXlsx(ReportGenerateRequestDTO request) {
        GeneratedReportResponseDTO report = generateStandardReportInternal(request);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet overviewSheet = workbook.createSheet("Overview");
            int overviewRowIndex = 0;
            overviewRowIndex = writeKeyValueRow(overviewSheet, overviewRowIndex, "Title", report.getTitle());
            overviewRowIndex = writeKeyValueRow(overviewSheet, overviewRowIndex, "Summary", report.getSummary());
            overviewRowIndex = writeKeyValueRow(overviewSheet, overviewRowIndex, "Generated At", report.getGeneratedAt());
            overviewRowIndex = writeKeyValueRow(overviewSheet, overviewRowIndex, "Report Mode", report.getReportMode());
            overviewRowIndex = writeKeyValueRow(overviewSheet, overviewRowIndex, "Date Range", report.getDateRange() != null
                    ? report.getDateRange().getStart() + " to " + report.getDateRange().getEnd()
                    : null);
            overviewRowIndex++;
            if (report.getMetrics() != null && !report.getMetrics().isEmpty()) {
                createHeaderRow(overviewSheet, overviewRowIndex++, List.of("Metric", "Value"));
                for (Map.Entry<String, Object> entry : report.getMetrics().entrySet()) {
                    writeDataRow(overviewSheet, overviewRowIndex++, List.of(formatPdfLabel(entry.getKey()), formatCellValue(entry.getValue())));
                }
            }
            autosizeColumns(overviewSheet, 2);

            int sheetCounter = 1;
            if (report.getSections() != null) {
                for (ReportSectionResponseDTO section : report.getSections()) {
                    if (!(section.getContent() instanceof List<?> contentList) || contentList.isEmpty() || !(contentList.get(0) instanceof Map<?, ?>)) {
                        continue;
                    }
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rows = sanitizeRowsForExport((List<Map<String, Object>>) section.getContent());
                    if (rows.isEmpty()) {
                        continue;
                    }
                    Sheet sheet = workbook.createSheet(safeSheetName(sheetCounter++ + "-" + section.getTitle()));
                    writeRowSheet(sheet, rows);
                }
            }

            workbook.write(outputStream);
            meterRegistry.counter("crm.reports.export.total", "format", "xlsx", "report_type", report.getReportType(), "result", "success").increment();
            return outputStream.toByteArray();
        } catch (Exception exception) {
            meterRegistry.counter("crm.reports.export.total", "format", "xlsx", "report_type", normalize(request.getReportType()), "result", "failure").increment();
            throw new BadRequestException("Unable to export report XLSX: " + exception.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<StandardReportDefinitionResponseDTO> listStandardDefinitions() {
        UUID tenantId = requireTenant();
        return standardReportDefinitionRepository.findByTenantIdAndArchivedFalseOrderByUpdatedAtDesc(tenantId).stream()
                .map(this::toDefinitionResponse)
                .toList();
    }

    @Override
    @Transactional
    public StandardReportDefinitionResponseDTO saveStandardDefinition(StandardReportDefinitionRequestDTO request) {
        String reportType = normalize(request.getReportType());
        TemplateDefinition template = requireTemplate(reportType);
        UUID tenantId = requireTenant();
        ReportDateRangeRequestDTO range = resolveDateRange(request.getDateRange());

        StandardReportDefinition definition = StandardReportDefinition.builder()
                .name(request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : template.title)
                .reportType(reportType)
                .reportMode(normalizeMode(request.getReportMode()))
                .dateStart(range.getStart())
                .dateEnd(range.getEnd())
                .filtersJson(writeFilters(request.getFilters()))
                .runCount(0)
                .build();
        definition.setTenantId(tenantId);

        StandardReportDefinition saved = standardReportDefinitionRepository.save(definition);
        meterRegistry.counter("crm.reports.definitions.total", "action", "save", "result", "success").increment();
        return toDefinitionResponse(saved);
    }

    @Override
    @Transactional
    public void deleteStandardDefinition(UUID definitionId) {
        UUID tenantId = requireTenant();
        StandardReportDefinition definition = standardReportDefinitionRepository
                .findByTenantIdAndIdAndArchivedFalse(tenantId, definitionId)
                .orElseThrow(() -> new BadRequestException("Saved report definition not found"));
        definition.setArchived(true);
        standardReportDefinitionRepository.save(definition);
        meterRegistry.counter("crm.reports.definitions.total", "action", "delete", "result", "success").increment();
    }

    @Override
    @Transactional
    public GeneratedReportResponseDTO runStandardDefinition(UUID definitionId) {
        UUID tenantId = requireTenant();
        StandardReportDefinition definition = standardReportDefinitionRepository
                .findByTenantIdAndIdAndArchivedFalse(tenantId, definitionId)
                .orElseThrow(() -> new BadRequestException("Saved report definition not found"));

        ReportGenerateRequestDTO request = ReportGenerateRequestDTO.builder()
                .reportType(definition.getReportType())
                .reportMode(definition.getReportMode())
                .dateRange(ReportDateRangeRequestDTO.builder()
                        .start(definition.getDateStart())
                        .end(definition.getDateEnd())
                        .build())
                .filters(readFilters(definition.getFiltersJson()))
                .build();

        GeneratedReportResponseDTO response = generateStandardReportInternal(request);
        definition.setRunCount((definition.getRunCount() == null ? 0 : definition.getRunCount()) + 1);
        definition.setLastRunAt(LocalDateTime.now());
        standardReportDefinitionRepository.save(definition);
        meterRegistry.counter("crm.reports.definitions.total", "action", "run", "result", "success").increment();
        return response;
    }

    private GeneratedReportResponseDTO generateStandardReportInternal(ReportGenerateRequestDTO request) {
        String reportType = normalize(request.getReportType());
        String reportMode = normalizeMode(request.getReportMode());
        TemplateDefinition template = requireTemplate(reportType);
        UUID tenantId = requireTenant();
        ReportDateRangeRequestDTO range = resolveDateRange(request.getDateRange());
        ReportContext context = loadContext(tenantId);
        ReportResult result = buildReport(template, reportType, reportMode, range, context);
        return GeneratedReportResponseDTO.builder()
                .success(true)
                .reportType(reportType)
                .reportMode(reportMode)
                .title(result.title)
                .summary(result.summary)
                .dateRange(range)
                .metrics(result.metrics)
                .charts(result.charts)
                .insights(result.insights)
                .recommendations(result.recommendations)
                .sections(result.sections)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private TemplateDefinition requireTemplate(String reportType) {
        return TEMPLATES.stream()
                .filter(candidate -> candidate.id.equals(reportType))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Unsupported report type: " + reportType));
    }

    private StandardReportDefinitionResponseDTO toDefinitionResponse(StandardReportDefinition definition) {
        return StandardReportDefinitionResponseDTO.builder()
                .id(definition.getId())
                .name(definition.getName())
                .reportType(definition.getReportType())
                .reportMode(definition.getReportMode())
                .dateRange(ReportDateRangeRequestDTO.builder()
                        .start(definition.getDateStart())
                        .end(definition.getDateEnd())
                        .build())
                .filters(readFilters(definition.getFiltersJson()))
                .runCount(definition.getRunCount())
                .lastRunAt(definition.getLastRunAt())
                .createdAt(definition.getCreatedAt())
                .updatedAt(definition.getUpdatedAt())
                .build();
    }

    private String writeFilters(Map<String, Object> filters) {
        try {
            return objectMapper.writeValueAsString(filters == null ? Map.of() : filters);
        } catch (Exception exception) {
            throw new BadRequestException("Unable to store report filters");
        }
    }

    private Map<String, Object> readFilters(String filtersJson) {
        if (filtersJson == null || filtersJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(filtersJson, new TypeReference<>() {});
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private int writeKeyValueRow(Sheet sheet, int rowIndex, String label, Object value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(formatCellValue(value));
        return rowIndex + 1;
    }

    private void createHeaderRow(Sheet sheet, int rowIndex, List<String> headers) {
        Row headerRow = sheet.createRow(rowIndex);
        CellStyle headerStyle = sheet.getWorkbook().createCellStyle();
        headerStyle.setAlignment(HorizontalAlignment.LEFT);
        for (int i = 0; i < headers.size(); i++) {
            org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(headerStyle);
        }
    }

    private void writeDataRow(Sheet sheet, int rowIndex, List<String> values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.size(); i++) {
            row.createCell(i).setCellValue(values.get(i));
        }
    }

    private void writeRowSheet(Sheet sheet, List<Map<String, Object>> rows) {
        List<String> headers = new ArrayList<>(rows.get(0).keySet());
        createHeaderRow(sheet, 0, headers.stream().map(this::formatPdfLabel).toList());
        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            Row row = sheet.createRow(rowIndex + 1);
            Map<String, Object> values = rows.get(rowIndex);
            for (int columnIndex = 0; columnIndex < headers.size(); columnIndex++) {
                row.createCell(columnIndex).setCellValue(formatCellValue(values.get(headers.get(columnIndex))));
            }
        }
        autosizeColumns(sheet, headers.size());
    }

    private void autosizeColumns(Sheet sheet, int columnCount) {
        for (int index = 0; index < columnCount; index++) {
            sheet.autoSizeColumn(index);
        }
    }

    private String safeSheetName(String candidate) {
        String sanitized = candidate.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        if (sanitized.isBlank()) {
            sanitized = "Report";
        }
        return sanitized.length() > 31 ? sanitized.substring(0, 31) : sanitized;
    }

    private String formatCellValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof LocalDate || value instanceof LocalDateTime) {
            return String.valueOf(value);
        }
        if (value instanceof Number number) {
            return formatPdfValue(number, null);
        }
        return String.valueOf(value);
    }

    private ReportResult buildReport(TemplateDefinition template, String reportType, String reportMode, ReportDateRangeRequestDTO range, ReportContext context) {
        return switch (reportType) {
            case "sales_pipeline_summary" -> buildPipelineSummary(template.title, reportMode, range, context);
            case "revenue_summary_report" -> buildRevenueSummary(template.title, reportMode, range, context);
            case "deals_closing_this_month" -> buildDealsClosingThisMonth(template.title, reportMode, range, context);
            case "deals_lost_this_month" -> buildDealsLostThisMonth(template.title, reportMode, range, context);
            case "sales_trend_report" -> buildSalesTrend(template.title, reportMode, range, context);
            case "forecast_summary_report" -> buildForecastSummary(template.title, reportMode, range, context);

            case "deals_by_stage" -> groupedDeals(template.title, reportMode, range, context, deal -> label(deal.getStage()), "stage");
            case "deals_by_owner" -> groupedDeals(template.title, reportMode, range, context, deal -> context.userName(deal.getOwnerId()), "owner");
            case "deals_by_closing_date" -> groupedDeals(template.title, reportMode, range, context, deal -> deal.getExpectedCloseDate() != null ? YearMonth.from(deal.getExpectedCloseDate()).toString() : "Unknown", "closing_period");
            case "won_deals_report" -> dealTable(template.title, reportMode, range, context, deal -> deal.getStage() == DealStage.CLOSED_WON, "Closed won deals in the selected range.");
            case "lost_deals_report" -> dealTable(template.title, reportMode, range, context, deal -> deal.getStage() == DealStage.CLOSED_LOST, "Closed lost deals in the selected range.");
            case "deals_by_type" -> groupedDeals(template.title, reportMode, range, context, deal -> label(deal.getDealType()), "deal_type");
            case "deals_by_industry" -> groupedDeals(template.title, reportMode, range, context, deal -> label(companyIndustry(context, deal.getCompanyId())), "industry");
            case "deals_by_lead_source" -> groupedDeals(template.title, reportMode, range, context, deal -> safeText(deal.getLeadSource()), "lead_source");
            case "pipeline_value_report" -> groupedDeals(template.title, reportMode, range, context, deal -> label(deal.getStage()), "stage", deal -> !isClosedDeal(deal));

            case "leads_by_source" -> groupedLeads(template.title, reportMode, range, context, lead -> label(lead.getSource()), "source");
            case "leads_by_status" -> groupedLeads(template.title, reportMode, range, context, lead -> label(lead.getStatus()), "status");
            case "leads_by_industry" -> groupedLeads(template.title, reportMode, range, context, lead -> label(companyIndustry(context, lead.getCompany())), "industry");
            case "leads_converted_report" -> leadTable(template.title, reportMode, range, context, lead -> lead.getStatus() == LeadStatus.CONVERTED, "Converted leads in the selected range.");
            case "leads_not_contacted" -> leadTable(template.title, reportMode, range, context, lead -> lead.getLastContactDate() == null, "Leads with no contact activity recorded.");
            case "leads_by_owner" -> groupedLeads(template.title, reportMode, range, context, lead -> context.userName(lead.getOwnerId()), "owner");
            case "leads_created_over_time" -> groupedLeads(template.title, reportMode, range, context, lead -> YearMonth.from(lead.getCreatedAt().toLocalDate()).toString(), "created_month");

            case "lead_to_deal_conversion_report" -> leadConversionReport(template.title, reportMode, range, context);
            case "lead_conversion_funnel" -> leadConversionFunnel(template.title, reportMode, range, context);
            case "conversion_by_source" -> leadConversionBy(template.title, reportMode, range, context, lead -> label(lead.getSource()), "source");
            case "conversion_by_sales_rep" -> leadConversionBy(template.title, reportMode, range, context, lead -> context.userName(lead.getOwnerId()), "owner");

            case "activities_by_type" -> activitiesByType(template.title, reportMode, range, context);
            case "activities_by_user" -> activitiesByUser(template.title, reportMode, range, context);
            case "calls_made_report" -> eventTable(template.title, reportMode, range, context, event -> event.getEventType() == EventType.CALL, "Logged calls in the selected range.");
            case "meetings_scheduled_report" -> eventTable(template.title, reportMode, range, context, event -> event.getEventType() == EventType.MEETING, "Meetings scheduled in the selected range.");
            case "tasks_completed_report" -> taskTable(template.title, reportMode, range, context, task -> task.getStatus() == TaskStatus.COMPLETED, "Completed tasks in the selected range.");
            case "overdue_activities" -> taskTable(template.title, reportMode, range, context, task -> task.getDueDate() != null && task.getDueDate().isBefore(range.getEnd()) && task.getStatus() != TaskStatus.COMPLETED, "Open tasks that are overdue.");
            case "last_activity_by_record" -> lastActivityByRecord(template.title, reportMode, range, context);

            case "accounts_by_industry" -> groupedCompanies(template.title, reportMode, range, context, company -> label(company.getIndustry()), "industry");
            case "accounts_by_owner" -> groupedCompanies(template.title, reportMode, range, context, company -> context.userName(company.getOwnerId()), "owner");
            case "contacts_by_source" -> groupedContacts(template.title, reportMode, range, context, contact -> safeText(contact.getConsentSource()), "source");
            case "contacts_created_over_time" -> groupedContacts(template.title, reportMode, range, context, contact -> YearMonth.from(contact.getCreatedAt().toLocalDate()).toString(), "created_month");
            case "contact_activity_report" -> contactActivity(template.title, reportMode, range, context);

            case "campaign_roi_report" -> campaignRoi(template.title, reportMode, range, context);
            case "leads_by_campaign" -> leadsByCampaign(template.title, reportMode, range, context);
            case "campaign_revenue_report" -> campaignRevenue(template.title, reportMode, range, context);
            case "campaign_status_report" -> groupedCampaigns(template.title, reportMode, range, context, campaign -> label(campaign.getStatus()), "status");
            case "email_campaign_performance" -> emailCampaignPerformance(template.title, reportMode, range, context);

            case "products_by_revenue", "products_sold_report" -> productsByRevenue(template.title, reportMode, range, context);
            case "quotes_report" -> quoteTable(template.title, reportMode, range, context);
            case "sales_orders_report" -> placeholder(template.title, "Sales orders are not modeled in this CRM yet.");
            case "invoices_report" -> invoiceTable(template.title, reportMode, range, context);
            case "purchase_orders_report" -> placeholder(template.title, "Purchase orders are not modeled in this CRM yet.");

            case "sales_forecast_by_user" -> forecastByOwner(template.title, reportMode, range, context);
            case "sales_forecast_by_territory" -> forecastByTerritory(template.title, reportMode, range, context);
            case "forecast_vs_actual" -> forecastVsActual(template.title, reportMode, range, context);
            case "quota_vs_achievement" -> quotaVsAchievement(template.title, reportMode, range, context);

            case "cases_by_status" -> groupedCases(template.title, reportMode, range, context, supportCase -> label(supportCase.getStatus()), "status");
            case "cases_by_priority" -> groupedCases(template.title, reportMode, range, context, supportCase -> label(supportCase.getPriority()), "priority");
            case "cases_by_owner" -> groupedCases(template.title, reportMode, range, context, supportCase -> context.userName(supportCase.getOwnerId()), "owner");
            case "open_vs_closed_cases" -> openVsClosedCases(template.title, reportMode, range, context);
            case "cases_by_category" -> groupedCases(template.title, reportMode, range, context, supportCase -> label(supportCase.getCaseType()), "category");
            case "escalated_cases" -> caseTable(template.title, reportMode, range, context, supportCase -> supportCase.getStatus() == SupportCaseStatus.ESCALATED || supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED || supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED, "Escalated or SLA-breached cases.");

            case "sales_by_territory" -> wonRevenueBy(template.title, reportMode, range, context, deal -> safeText(deal.getTerritory()), "territory");
            case "performance_by_sales_rep" -> performanceByRep(template.title, reportMode, range, context);
            case "revenue_by_region" -> wonRevenueBy(template.title, reportMode, range, context, deal -> companyRegion(context, deal.getCompanyId()), "region");
            case "deals_by_territory" -> groupedDeals(template.title, reportMode, range, context, deal -> safeText(deal.getTerritory()), "territory");

            case "user_activity_report" -> userActivity(template.title, reportMode, range, context);
            case "login_history_report" -> loginHistory(template.title, reportMode, range, context);
            case "record_modification_report" -> recordModification(template.title, reportMode, range, context);
            case "audit_log_report" -> auditLogTable(template.title, reportMode, range, context);

            default -> placeholder(template.title, "Report generation is still being wired.");
        };
    }

    private ReportContext loadContext(UUID tenantId) {
        return new ReportContext(
                loadDeals(tenantId),
                loadLeads(tenantId),
                companyRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                contactRepository.findByTenantIdAndArchivedFalse(tenantId),
                taskRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                eventRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                campaignRepository.findByTenantIdAndArchivedFalse(tenantId),
                supportCaseRepository.findAll(buildSupportCaseSpec(tenantId)),
                quoteRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                invoiceRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                productRepository.findAll().stream().filter(this::inTenantScope).filter(item -> !Boolean.TRUE.equals(item.getArchived())).toList(),
                userRepository.findByTenantIdAndArchivedFalse(tenantId),
                userSessionRepository.findByTenantIdAndArchivedFalse(tenantId),
                auditLogRepository.findByTenantId(tenantId, PageRequest.of(0, 500)).getContent()
        );
    }

    private ReportResult report(String title, String summary, Map<String, Object> metrics, List<Map<String, Object>> rows, String mode, String xAxis, String yAxis) {
        List<ReportSectionResponseDTO> sections = new ArrayList<>();
        sections.add(ReportSectionResponseDTO.builder().title("Metrics").type("metrics").content(metrics).build());
        List<Map<String, Object>> visibleRows = sanitizeRowsForExport(rows);
        if (!rows.isEmpty()) {
            if (MODE_MATRIX.equals(mode)) {
                sections.add(ReportSectionResponseDTO.builder().title("Matrix").type("matrix").content(matrix(visibleRows)).build());
            } else {
                sections.add(ReportSectionResponseDTO.builder().title(MODE_TABULAR.equals(mode) ? "Table" : "Summary").type(MODE_TABULAR.equals(mode) ? "table" : "summary").content(rows).build());
            }
            sections.add(ReportSectionResponseDTO.builder().title("Charts").type("charts").content(List.of(chart("bar", title, visibleRows, xAxis, yAxis))).build());
        }
        sections.add(ReportSectionResponseDTO.builder().title("Insights").type("insights").content(List.of("The report contains " + rows.size() + " grouped rows for the selected date range.")).build());
        sections.add(ReportSectionResponseDTO.builder().title("Recommendations").type("recommendations").content(List.of(rows.isEmpty() ? "Widen the date range or add more test data for this report." : "Use grouped rows to drill into the underlying records during QA.")).build());
        return new ReportResult(title, summary, metrics, rows.isEmpty() ? List.of() : List.of(chart("bar", title, visibleRows, xAxis, yAxis)), List.of("The report contains " + rows.size() + " grouped rows for the selected date range."), List.of(rows.isEmpty() ? "Widen the date range or add more test data for this report." : "Use grouped rows to drill into the underlying records during QA."), sections);
    }

    private Map<String, Object> matrix(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) {
            return Map.of("columns", List.of(), "rows", List.of());
        }
        String labelKey = rows.get(0).keySet().iterator().next();
        List<String> numericColumns = rows.get(0).entrySet().stream().filter(entry -> !entry.getKey().equals(labelKey)).filter(entry -> entry.getValue() instanceof Number || entry.getValue() instanceof BigDecimal).map(Map.Entry::getKey).toList();
        List<Map<String, Object>> matrixRows = rows.stream().map(row -> {
            Map<String, Object> values = new LinkedHashMap<>();
            for (String column : numericColumns) {
                values.put(column, row.get(column));
            }
            BigDecimal total = numericColumns.stream().map(column -> money(row.get(column))).reduce(BigDecimal.ZERO, BigDecimal::add);
            return row("label", row.get(labelKey), "values", values, "total", total);
        }).toList();
        return Map.of("columns", numericColumns, "rows", matrixRows);
    }

    private static Map<String, Object> row(Object... values) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) {
            row.put(String.valueOf(values[i]), values[i + 1]);
        }
        return row;
    }

    private static Map<String, Object> chart(String type, String title, Object data, String xAxis, String yAxis) {
        return row("type", type, "title", title, "data", data, "xAxis", xAxis, "yAxis", yAxis);
    }

    private List<Map<String, Object>> sanitizeRowsForExport(List<Map<String, Object>> rows) {
        return rows.stream()
                .map(row -> {
                    Map<String, Object> visible = new LinkedHashMap<>();
                    row.forEach((key, value) -> {
                        if (!isHiddenReportField(key)) {
                            visible.put(key, value);
                        }
                    });
                    return visible;
                })
                .collect(Collectors.toList());
    }

    private boolean isHiddenReportField(String key) {
        return key != null && key.startsWith("_");
    }

    private ReportResult buildPipelineSummary(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Deal> deals = dealsInRange(context, range, deal -> true);
        return groupedDeals(title, mode, range, context, deal -> label(deal.getStage()), "stage", deal -> true, Map.of(
                "open_deals", deals.stream().filter(deal -> !isClosedDeal(deal)).count(),
                "pipeline_value", sumMoney(deals.stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getValue).toList()),
                "weighted_pipeline", sumMoney(deals.stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getWeightedValue).toList()),
                "won_value", sumMoney(deals.stream().filter(deal -> deal.getStage() == DealStage.CLOSED_WON).map(Deal::getValue).toList())
        ), "Sales pipeline grouped by stage.");
    }

    private ReportResult buildRevenueSummary(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Deal> deals = dealsInRange(context, range, deal -> true);
        List<Invoice> invoices = invoicesInRange(context, range);
        List<Map<String, Object>> rows = List.of(
                row("metric", "Won Revenue", "amount", sumMoney(deals.stream().filter(deal -> deal.getStage() == DealStage.CLOSED_WON).map(Deal::getValue).toList())),
                row("metric", "Open Pipeline", "amount", sumMoney(deals.stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getValue).toList())),
                row("metric", "Weighted Pipeline", "amount", sumMoney(deals.stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getWeightedValue).toList())),
                row("metric", "Invoice Total", "amount", sumMoney(invoices.stream().map(Invoice::getTotal).toList())),
                row("metric", "Amount Paid", "amount", sumMoney(invoices.stream().map(Invoice::getAmountPaid).toList()))
        );
        return report(title, "Revenue rollup from deals and invoices.", Map.of("metric_count", rows.size()), rows, mode, "metric", "amount");
    }

    private ReportResult buildDealsClosingThisMonth(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        YearMonth month = YearMonth.from(range.getEnd());
        List<Map<String, Object>> rows = context.deals.stream()
                .filter(deal -> deal.getExpectedCloseDate() != null && YearMonth.from(deal.getExpectedCloseDate()).equals(month))
                .map(deal -> detailedDealRow(context, deal))
                .toList();
        return report(title, "Deals closing in the current month.", Map.of("deal_count", rows.size()), rows, mode, "expected_close_date", "value");
    }

    private ReportResult buildDealsLostThisMonth(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        YearMonth month = YearMonth.from(range.getEnd());
        List<Map<String, Object>> rows = context.deals.stream()
                .filter(deal -> deal.getStage() == DealStage.CLOSED_LOST)
                .filter(deal -> deal.getActualCloseDate() != null && YearMonth.from(deal.getActualCloseDate()).equals(month))
                .map(deal -> {
                    Map<String, Object> row = new LinkedHashMap<>(detailedDealRow(context, deal));
                    row.put("loss_reason", safeText(deal.getLossReason()));
                    return row;
                })
                .toList();
        return report(title, "Deals lost in the current month.", Map.of("deal_count", rows.size()), rows, mode, "actual_close_date", "value");
    }

    private ReportResult buildSalesTrend(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        Map<String, BigDecimal> wonByMonth = new LinkedHashMap<>();
        dealsInRange(context, range, deal -> deal.getStage() == DealStage.CLOSED_WON).forEach(deal -> {
            LocalDate reference = deal.getActualCloseDate() != null ? deal.getActualCloseDate() : deal.getExpectedCloseDate();
            if (reference != null) {
                String key = YearMonth.from(reference).toString();
                wonByMonth.put(key, wonByMonth.getOrDefault(key, BigDecimal.ZERO).add(money(deal.getValue())));
            }
        });
        List<Map<String, Object>> rows = wonByMonth.entrySet().stream().map(entry -> row("month", entry.getKey(), "won_revenue", entry.getValue())).toList();
        return report(title, "Monthly won-revenue trend.", Map.of("won_revenue", sumMoney(rows.stream().map(item -> money(item.get("won_revenue"))).toList())), rows, mode, "month", "won_revenue");
    }

    private ReportResult buildForecastSummary(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = forecastRows(context, range, deal -> context.userName(deal.getOwnerId()), "owner");
        return report(title, "Deterministic forecast summary from quota, actuals, and weighted pipeline.", Map.of("row_count", rows.size()), rows, mode, "owner", "forecast");
    }

    private ReportResult groupedDeals(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Deal, String> grouper, String key) {
        return groupedDeals(title, mode, range, context, grouper, key, deal -> true);
    }

    private ReportResult groupedDeals(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Deal, String> grouper, String key, java.util.function.Predicate<Deal> predicate) {
        return groupedDeals(title, mode, range, context, grouper, key, predicate, null, "Deals grouped by " + key.replace('_', ' ') + ".");
    }

    private ReportResult groupedDeals(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Deal, String> grouper, String key, java.util.function.Predicate<Deal> predicate, Map<String, Object> metrics, String summary) {
        List<Deal> deals = dealsInRange(context, range, predicate);
        List<Map<String, Object>> rows = deals.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "deal_count", entry.getValue().size(), "pipeline_value", sumMoney(entry.getValue().stream().map(Deal::getValue).toList()), "weighted_pipeline", sumMoney(entry.getValue().stream().map(Deal::getWeightedValue).toList()))).toList();
        Map<String, Object> resolved = metrics != null ? metrics : Map.of("deal_count", deals.size(), "pipeline_value", sumMoney(deals.stream().map(Deal::getValue).toList()), "weighted_pipeline", sumMoney(deals.stream().map(Deal::getWeightedValue).toList()));
        return report(title, summary, resolved, rows, mode, key, rows.isEmpty() ? "deal_count" : "pipeline_value");
    }

    private ReportResult dealTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, java.util.function.Predicate<Deal> predicate, String summary) {
        List<Map<String, Object>> rows = dealsInRange(context, range, predicate).stream().map(deal -> detailedDealRow(context, deal)).toList();
        return report(title, summary, Map.of("deal_count", rows.size()), rows, mode, "name", "value");
    }

    private ReportResult groupedLeads(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Lead, String> grouper, String key) {
        List<Lead> leads = leadsInRange(context, range, lead -> true);
        List<Map<String, Object>> rows = leads.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "lead_count", entry.getValue().size(), "estimated_value", sumMoney(entry.getValue().stream().map(Lead::getEstimatedValue).toList()))).toList();
        return report(title, "Leads grouped by " + key.replace('_', ' ') + ".", Map.of("lead_count", leads.size()), rows, mode, key, rows.isEmpty() ? "lead_count" : "estimated_value");
    }

    private ReportResult leadTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, java.util.function.Predicate<Lead> predicate, String summary) {
        List<Map<String, Object>> rows = leadsInRange(context, range, predicate).stream().map(lead -> row(
                "lead", lead.getFullName(),
                "owner", context.userName(lead.getOwnerId()),
                "source", label(lead.getSource()),
                "status", label(lead.getStatus()),
                "company", safeText(lead.getCompany()),
                "estimated_value", money(lead.getEstimatedValue()),
                "_record_type", "LEAD",
                "_record_id", lead.getId(),
                "_record_path", "/leads?focus=" + lead.getId(),
                "_record_label", lead.getFullName()
        )).toList();
        return report(title, summary, Map.of("lead_count", rows.size()), rows, mode, "lead", "estimated_value");
    }

    private ReportResult leadConversionReport(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Lead> leads = leadsInRange(context, range, lead -> true);
        long converted = leads.stream().filter(lead -> lead.getStatus() == LeadStatus.CONVERTED).count();
        return report(title, "Lead-to-opportunity conversion summary.", Map.of("lead_count", leads.size(), "converted_leads", converted, "conversion_rate", percentage(converted, leads.size())), List.of(row("stage", "Leads", "count", leads.size()), row("stage", "Converted", "count", converted)), mode, "stage", "count");
    }

    private ReportResult leadConversionFunnel(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Lead> leads = leadsInRange(context, range, lead -> true);
        List<Map<String, Object>> rows = List.of(
                row("stage", "New", "count", leads.stream().filter(lead -> lead.getStatus() == LeadStatus.NEW).count()),
                row("stage", "Contacted", "count", leads.stream().filter(lead -> lead.getStatus() == LeadStatus.CONTACTED).count()),
                row("stage", "Qualified", "count", leads.stream().filter(lead -> lead.getStatus() == LeadStatus.QUALIFIED).count()),
                row("stage", "Converted", "count", leads.stream().filter(lead -> lead.getStatus() == LeadStatus.CONVERTED).count())
        );
        return report(title, "Lead funnel from new through converted.", Map.of("lead_count", leads.size()), rows, mode, "stage", "count");
    }

    private ReportResult leadConversionBy(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Lead, String> grouper, String key) {
        List<Lead> leads = leadsInRange(context, range, lead -> true);
        List<Map<String, Object>> rows = leads.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> {
            long converted = entry.getValue().stream().filter(lead -> lead.getStatus() == LeadStatus.CONVERTED).count();
            return row(key, entry.getKey(), "lead_count", entry.getValue().size(), "converted_count", converted, "conversion_rate", percentage(converted, entry.getValue().size()));
        }).toList();
        return report(title, "Lead conversion grouped by " + key + ".", Map.of("lead_count", leads.size()), rows, mode, key, "conversion_rate");
    }

    private ReportResult activitiesByType(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        Map<String, Long> counts = new LinkedHashMap<>();
        tasksInRange(context, range, task -> true).forEach(task -> counts.merge("TASK " + label(task.getStatus()), 1L, Long::sum));
        eventsInRange(context, range, event -> true).forEach(event -> counts.merge("EVENT " + label(event.getEventType()), 1L, Long::sum));
        List<Map<String, Object>> rows = counts.entrySet().stream().map(entry -> row("activity_type", entry.getKey(), "activity_count", entry.getValue())).toList();
        return report(title, "Activities grouped by type.", Map.of("activity_count", rows.stream().mapToLong(item -> ((Number) item.get("activity_count")).longValue()).sum()), rows, mode, "activity_type", "activity_count");
    }

    private ReportResult activitiesByUser(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Task> tasks = tasksInRange(context, range, task -> true);
        List<Map<String, Object>> rows = tasks.stream().collect(Collectors.groupingBy(task -> context.userName(task.getAssignedTo()), LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row("user", entry.getKey(), "activity_count", entry.getValue().size(), "completed_tasks", entry.getValue().stream().filter(task -> task.getStatus() == TaskStatus.COMPLETED).count())).toList();
        return report(title, "Activities grouped by user.", Map.of("activity_count", tasks.size()), rows, mode, "user", "activity_count");
    }

    private ReportResult eventTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, java.util.function.Predicate<Event> predicate, String summary) {
        List<Map<String, Object>> rows = eventsInRange(context, range, predicate).stream().map(event -> row(
                "title", event.getTitle(),
                "event_type", label(event.getEventType()),
                "start_date_time", event.getStartDateTime(),
                "end_date_time", event.getEndDateTime(),
                "location", safeText(event.getLocation()),
                "_record_type", "EVENT",
                "_record_id", event.getId(),
                "_record_path", "/calendar?focus=" + event.getId(),
                "_record_label", event.getTitle()
        )).toList();
        return report(title, summary, Map.of("event_count", rows.size()), rows, mode, "start_date_time", "event_type");
    }

    private ReportResult taskTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, java.util.function.Predicate<Task> predicate, String summary) {
        List<Map<String, Object>> rows = tasksInRange(context, range, predicate).stream().map(task -> row(
                "title", task.getTitle(),
                "assigned_to", context.userName(task.getAssignedTo()),
                "due_date", task.getDueDate(),
                "status", label(task.getStatus()),
                "priority", label(task.getPriority()),
                "_record_type", "TASK",
                "_record_id", task.getId(),
                "_record_path", "/tasks?focus=" + task.getId(),
                "_record_label", task.getTitle()
        )).toList();
        return report(title, summary, Map.of("task_count", rows.size()), rows, mode, "due_date", "priority");
    }

    private ReportResult lastActivityByRecord(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = new ArrayList<>();
        context.leads.stream().filter(lead -> lead.getLastContactDate() != null && withinRange(lead.getLastContactDate().toLocalDate(), range)).forEach(lead -> rows.add(row("record_type", "Lead", "record_name", lead.getFullName(), "owner", context.userName(lead.getOwnerId()), "last_activity_at", lead.getLastContactDate())));
        context.contacts.stream().filter(contact -> contact.getLastContactDate() != null && withinRange(contact.getLastContactDate().toLocalDate(), range)).forEach(contact -> rows.add(row("record_type", "Contact", "record_name", contact.getFullName(), "company", companyName(context, contact.getCompanyId()), "last_activity_at", contact.getLastContactDate())));
        return report(title, "Last recorded activity by lead or contact.", Map.of("record_count", rows.size()), rows, mode, "record_type", "last_activity_at");
    }

    private ReportResult groupedCompanies(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Company, String> grouper, String key) {
        List<Company> companies = companiesInRange(context, range);
        List<Map<String, Object>> rows = companies.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "account_count", entry.getValue().size())).toList();
        return report(title, "Accounts grouped by " + key + ".", Map.of("account_count", companies.size()), rows, mode, key, "account_count");
    }

    private ReportResult groupedContacts(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Contact, String> grouper, String key) {
        List<Contact> contacts = contactsInRange(context, range);
        List<Map<String, Object>> rows = contacts.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "contact_count", entry.getValue().size())).toList();
        return report(title, "Contacts grouped by " + key + ".", Map.of("contact_count", contacts.size()), rows, mode, key, "contact_count");
    }

    private ReportResult contactActivity(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = contactsInRange(context, range).stream().map(contact -> row(
                "contact", contact.getFullName(),
                "company", companyName(context, contact.getCompanyId()),
                "status", label(contact.getStatus()),
                "last_contact_date", contact.getLastContactDate(),
                "_record_type", "CONTACT",
                "_record_id", contact.getId(),
                "_record_path", "/contacts?focus=" + contact.getId(),
                "_record_label", contact.getFullName()
        )).toList();
        return report(title, "Contact activity and last-contact dates.", Map.of("contact_count", rows.size()), rows, mode, "contact", "last_contact_date");
    }

    private ReportResult campaignRoi(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = campaignsInRange(context, range).stream().map(campaign -> row("campaign", campaign.getName(), "status", label(campaign.getStatus()), "budget", money(campaign.getBudget()), "actual_revenue", money(campaign.getActualRevenue()), "roi_percent", percentage(money(campaign.getActualRevenue()).subtract(money(campaign.getBudget())), money(campaign.getBudget())))).toList();
        return report(title, "Campaign ROI and revenue performance.", Map.of("campaign_count", rows.size()), rows, mode, "campaign", "actual_revenue");
    }

    private ReportResult leadsByCampaign(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Lead> leads = leadsInRange(context, range, lead -> lead.getCampaignId() != null);
        List<Map<String, Object>> rows = leads.stream().collect(Collectors.groupingBy(lead -> campaignName(context, lead.getCampaignId()), LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row("campaign", entry.getKey(), "lead_count", entry.getValue().size(), "estimated_value", sumMoney(entry.getValue().stream().map(Lead::getEstimatedValue).toList()))).toList();
        return report(title, "Attributed leads grouped by campaign.", Map.of("lead_count", leads.size()), rows, mode, "campaign", "lead_count");
    }

    private ReportResult campaignRevenue(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = campaignsInRange(context, range).stream().map(campaign -> row("campaign", campaign.getName(), "expected_revenue", money(campaign.getExpectedRevenue()), "actual_revenue", money(campaign.getActualRevenue()), "conversions", safeInt(campaign.getConversions()))).toList();
        return report(title, "Campaign revenue contribution.", Map.of("campaign_count", rows.size()), rows, mode, "campaign", "actual_revenue");
    }

    private ReportResult groupedCampaigns(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Campaign, String> grouper, String key) {
        List<Campaign> campaigns = campaignsInRange(context, range);
        List<Map<String, Object>> rows = campaigns.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "campaign_count", entry.getValue().size(), "budget", sumMoney(entry.getValue().stream().map(Campaign::getBudget).toList()))).toList();
        return report(title, "Campaigns grouped by " + key + ".", Map.of("campaign_count", campaigns.size()), rows, mode, key, "campaign_count");
    }

    private ReportResult emailCampaignPerformance(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = campaignsInRange(context, range).stream().filter(campaign -> campaign.getChannel() == CampaignChannel.EMAIL || campaign.getChannel() == CampaignChannel.MULTI_CHANNEL).map(campaign -> row("campaign", campaign.getName(), "channel", label(campaign.getChannel()), "leads_generated", safeInt(campaign.getLeadsGenerated()), "conversions", safeInt(campaign.getConversions()), "actual_revenue", money(campaign.getActualRevenue()))).toList();
        return report(title, "Email-focused campaign performance.", Map.of("campaign_count", rows.size()), rows, mode, "campaign", "actual_revenue");
    }

    private ReportResult productsByRevenue(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        Map<String, BigDecimal> revenue = new LinkedHashMap<>();
        Map<String, Integer> quantity = new LinkedHashMap<>();
        invoicesInRange(context, range).forEach(invoice -> invoice.getItems().forEach(item -> {
            String name = item.getProduct() != null ? item.getProduct().getName() : safeText(item.getDescription());
            revenue.put(name, revenue.getOrDefault(name, BigDecimal.ZERO).add(money(item.getTotal())));
            quantity.put(name, quantity.getOrDefault(name, 0) + safeInt(item.getQuantity()));
        }));
        List<Map<String, Object>> rows = revenue.entrySet().stream().map(entry -> row("product", entry.getKey(), "quantity_sold", quantity.getOrDefault(entry.getKey(), 0), "revenue", entry.getValue())).toList();
        return report(title, "Product revenue based on invoice line items.", Map.of("product_count", rows.size()), rows, mode, "product", "revenue");
    }

    private ReportResult quoteTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = quotesInRange(context, range).stream().map(quote -> row(
                "quote_number", quote.getQuoteNumber(),
                "title", safeText(quote.getTitle()),
                "customer_name", safeText(quote.getCustomerName()),
                "owner", context.userName(quote.getOwnerId()),
                "issue_date", quote.getIssueDate(),
                "expiry_date", quote.getExpiryDate(),
                "status", label(quote.getStatus()),
                "total", money(quote.getTotal()),
                "_record_type", "QUOTE",
                "_record_id", quote.getId(),
                "_record_path", "/quotes?focus=" + quote.getId(),
                "_record_label", quote.getQuoteNumber()
        )).toList();
        return report(title, "Quotes in the selected range.", Map.of("quote_count", rows.size()), rows, mode, "issue_date", "total");
    }

    private ReportResult invoiceTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = invoicesInRange(context, range).stream().map(invoice -> row(
                "invoice_number", invoice.getInvoiceNumber(),
                "customer_name", safeText(invoice.getCustomerName()),
                "company", companyName(context, invoice.getCompanyId()),
                "issue_date", invoice.getIssueDate(),
                "due_date", invoice.getDueDate(),
                "status", label(invoice.getStatus()),
                "total", money(invoice.getTotal()),
                "amount_paid", money(invoice.getAmountPaid()),
                "outstanding", money(invoice.getAmountDue()),
                "_record_type", "INVOICE",
                "_record_id", invoice.getId(),
                "_record_path", "/invoices?focus=" + invoice.getId(),
                "_record_label", invoice.getInvoiceNumber()
        )).toList();
        return report(title, "Invoices in the selected range.", Map.of("invoice_count", rows.size()), rows, mode, "issue_date", "total");
    }

    private ReportResult forecastByOwner(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = forecastRows(context, range, deal -> context.userName(deal.getOwnerId()), "owner");
        return report(title, "Deterministic forecast grouped by owner.", Map.of("owner_count", rows.size()), rows, mode, "owner", "forecast");
    }

    private ReportResult forecastByTerritory(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = forecastRows(context, range, deal -> safeText(deal.getTerritory()), "territory");
        return report(title, "Deterministic forecast grouped by territory.", Map.of("territory_count", rows.size()), rows, mode, "territory", "forecast");
    }

    private ReportResult forecastVsActual(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Deal> deals = dealsInRange(context, range, deal -> true);
        BigDecimal actual = sumMoney(deals.stream().filter(deal -> deal.getStage() == DealStage.CLOSED_WON).map(Deal::getValue).toList());
        BigDecimal forecast = actual.add(sumMoney(deals.stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getWeightedValue).toList()));
        return report(title, "Forecast versus actual closed-won revenue.", Map.of("actual", actual, "forecast", forecast, "variance", forecast.subtract(actual)), List.of(row("measure", "Actual", "amount", actual), row("measure", "Forecast", "amount", forecast), row("measure", "Variance", "amount", forecast.subtract(actual))), mode, "measure", "amount");
    }

    private ReportResult quotaVsAchievement(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = forecastRows(context, range, deal -> context.userName(deal.getOwnerId()), "owner").stream().map(item -> row("owner", item.get("owner"), "quota", item.get("quota"), "actual", item.get("actual"), "achievement_percent", percentage(money(item.get("actual")), money(item.get("quota"))))).toList();
        return report(title, "Quota versus achievement by user.", Map.of("owner_count", rows.size()), rows, mode, "owner", "achievement_percent");
    }

    private ReportResult groupedCases(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<SupportCase, String> grouper, String key) {
        List<SupportCase> cases = casesInRange(context, range, supportCase -> true);
        List<Map<String, Object>> rows = cases.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "case_count", entry.getValue().size())).toList();
        return report(title, "Cases grouped by " + key + ".", Map.of("case_count", cases.size()), rows, mode, key, "case_count");
    }

    private ReportResult openVsClosedCases(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<SupportCase> cases = casesInRange(context, range, supportCase -> true);
        long open = cases.stream().filter(this::isOpenCase).count();
        return report(title, "Open versus closed cases.", Map.of("case_count", cases.size()), List.of(row("status", "Open", "case_count", open), row("status", "Closed", "case_count", cases.size() - open)), mode, "status", "case_count");
    }

    private ReportResult caseTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, java.util.function.Predicate<SupportCase> predicate, String summary) {
        List<Map<String, Object>> rows = casesInRange(context, range, predicate).stream().map(item -> row(
                "case_number", item.getCaseNumber(),
                "title", item.getTitle(),
                "owner", context.userName(item.getOwnerId()),
                "priority", label(item.getPriority()),
                "status", label(item.getStatus()),
                "queue", label(item.getSupportQueue()),
                "_record_type", "CASE",
                "_record_id", item.getId(),
                "_record_path", "/cases?focus=" + item.getId(),
                "_record_label", item.getCaseNumber()
        )).toList();
        return report(title, summary, Map.of("case_count", rows.size()), rows, mode, "case_number", "priority");
    }

    private ReportResult wonRevenueBy(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context, Function<Deal, String> grouper, String key) {
        List<Deal> deals = dealsInRange(context, range, deal -> deal.getStage() == DealStage.CLOSED_WON);
        List<Map<String, Object>> rows = deals.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row(key, entry.getKey(), "won_value", sumMoney(entry.getValue().stream().map(Deal::getValue).toList()))).toList();
        return report(title, "Closed-won revenue grouped by " + key + ".", Map.of("won_value", sumMoney(deals.stream().map(Deal::getValue).toList())), rows, mode, key, "won_value");
    }

    private ReportResult performanceByRep(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Deal> deals = dealsInRange(context, range, deal -> true);
        List<Map<String, Object>> rows = deals.stream().collect(Collectors.groupingBy(deal -> context.userName(deal.getOwnerId()), LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row("owner", entry.getKey(), "won_value", sumMoney(entry.getValue().stream().filter(deal -> deal.getStage() == DealStage.CLOSED_WON).map(Deal::getValue).toList()), "pipeline_value", sumMoney(entry.getValue().stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getValue).toList()), "deal_count", entry.getValue().size())).toList();
        return report(title, "Performance grouped by sales rep.", Map.of("rep_count", rows.size()), rows, mode, "owner", "won_value");
    }

    private ReportResult userActivity(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = context.users.values().stream().map(user -> row("user", user.getFullName(), "role", label(user.getRole()), "last_login_at", user.getLastLoginAt(), "active_sessions", context.userSessions.stream().filter(session -> Objects.equals(session.getUserId(), user.getId()) && withinRange(session.getLastUsedAt().toLocalDate(), range)).count(), "task_count", context.tasks.stream().filter(task -> Objects.equals(task.getAssignedTo(), user.getId()) && task.getDueDate() != null && withinRange(task.getDueDate(), range)).count())).toList();
        return report(title, "User session and workload activity.", Map.of("user_count", rows.size()), rows, mode, "user", "active_sessions");
    }

    private ReportResult loginHistory(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = context.userSessions.stream().filter(session -> withinRange(session.getLastUsedAt().toLocalDate(), range)).sorted(Comparator.comparing(UserSession::getLastUsedAt).reversed()).map(session -> row("user", context.userName(session.getUserId()), "last_used_at", session.getLastUsedAt(), "ip_address", safeText(session.getIpAddress()), "revoked_at", session.getRevokedAt())).toList();
        return report(title, "Recent session activity.", Map.of("session_count", rows.size()), rows, mode, "last_used_at", "user");
    }

    private ReportResult recordModification(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<AuditLog> logs = auditLogsInRange(context, range);
        List<Map<String, Object>> rows = logs.stream().collect(Collectors.groupingBy(AuditLog::getEntityType, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> row("entity_type", entry.getKey(), "modification_count", entry.getValue().size())).toList();
        return report(title, "Entity modifications grouped by entity type.", Map.of("modification_count", logs.size()), rows, mode, "entity_type", "modification_count");
    }

    private ReportResult auditLogTable(String title, String mode, ReportDateRangeRequestDTO range, ReportContext context) {
        List<Map<String, Object>> rows = auditLogsInRange(context, range).stream().sorted(Comparator.comparing(AuditLog::getTimestamp).reversed()).map(log -> row("timestamp", log.getTimestamp(), "entity_type", log.getEntityType(), "entity_id", log.getEntityId(), "action", log.getAction(), "user", log.getUserName())).toList();
        return report(title, "Audit log entries for the selected range.", Map.of("log_count", rows.size()), rows, mode, "timestamp", "action");
    }

    private List<Deal> loadDeals(UUID tenantId) {
        List<Specification<Deal>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Deal> accessScope = recordAccessService.dealReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        return dealRepository.findAll(SpecificationBuilder.combineWithAnd(specs));
    }

    private List<Lead> loadLeads(UUID tenantId) {
        List<Specification<Lead>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Lead> accessScope = recordAccessService.leadReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        return leadRepository.findAll(SpecificationBuilder.combineWithAnd(specs));
    }

    private Specification<SupportCase> buildSupportCaseSpec(UUID tenantId) {
        List<Specification<SupportCase>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<SupportCase> accessScope = recordAccessService.supportCaseReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        return SpecificationBuilder.combineWithAnd(specs);
    }

    private boolean inTenantScope(AbstractEntity entity) {
        return entity != null && Objects.equals(entity.getTenantId(), TenantContext.getTenantId());
    }

    private List<Deal> dealsInRange(ReportContext context, ReportDateRangeRequestDTO range, java.util.function.Predicate<Deal> predicate) {
        return context.deals.stream().filter(deal -> withinRange(resolveDealDate(deal), range)).filter(predicate).toList();
    }

    private List<Lead> leadsInRange(ReportContext context, ReportDateRangeRequestDTO range, java.util.function.Predicate<Lead> predicate) {
        return context.leads.stream().filter(lead -> lead.getCreatedAt() != null && withinRange(lead.getCreatedAt().toLocalDate(), range)).filter(predicate).toList();
    }

    private List<Company> companiesInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.companies.stream().filter(company -> company.getCreatedAt() != null && withinRange(company.getCreatedAt().toLocalDate(), range)).toList();
    }

    private List<Contact> contactsInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.contacts.stream().filter(contact -> contact.getCreatedAt() != null && withinRange(contact.getCreatedAt().toLocalDate(), range)).toList();
    }

    private List<Task> tasksInRange(ReportContext context, ReportDateRangeRequestDTO range, java.util.function.Predicate<Task> predicate) {
        return context.tasks.stream().filter(task -> task.getDueDate() != null && withinRange(task.getDueDate(), range)).filter(predicate).toList();
    }

    private List<Event> eventsInRange(ReportContext context, ReportDateRangeRequestDTO range, java.util.function.Predicate<Event> predicate) {
        return context.events.stream().filter(event -> event.getStartDateTime() != null && withinRange(event.getStartDateTime().toLocalDate(), range)).filter(predicate).toList();
    }

    private List<Campaign> campaignsInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.campaigns.stream().filter(campaign -> withinRange(campaign.getStartDate() != null ? campaign.getStartDate() : campaign.getCreatedAt() != null ? campaign.getCreatedAt().toLocalDate() : null, range)).toList();
    }

    private List<SupportCase> casesInRange(ReportContext context, ReportDateRangeRequestDTO range, java.util.function.Predicate<SupportCase> predicate) {
        return context.supportCases.stream().filter(item -> item.getCreatedAt() != null && withinRange(item.getCreatedAt().toLocalDate(), range)).filter(predicate).toList();
    }

    private List<Quote> quotesInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.quotes.stream().filter(item -> item.getIssueDate() != null && withinRange(item.getIssueDate(), range)).toList();
    }

    private List<Invoice> invoicesInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.invoices.stream().filter(item -> item.getIssueDate() != null && withinRange(item.getIssueDate(), range)).toList();
    }

    private List<AuditLog> auditLogsInRange(ReportContext context, ReportDateRangeRequestDTO range) {
        return context.auditLogs.stream().filter(item -> item.getTimestamp() != null && withinRange(item.getTimestamp().toLocalDate(), range)).toList();
    }

    private List<Map<String, Object>> forecastRows(ReportContext context, ReportDateRangeRequestDTO range, Function<Deal, String> grouper, String key) {
        List<Deal> deals = dealsInRange(context, range, deal -> true);
        return deals.stream().collect(Collectors.groupingBy(grouper, LinkedHashMap::new, Collectors.toList())).entrySet().stream().map(entry -> {
            User user = context.userByName(entry.getKey());
            BigDecimal quota = user != null ? money(user.getQuarterlyQuota()) : BigDecimal.ZERO;
            BigDecimal actual = sumMoney(entry.getValue().stream().filter(deal -> deal.getStage() == DealStage.CLOSED_WON).map(Deal::getValue).toList());
            BigDecimal weighted = sumMoney(entry.getValue().stream().filter(deal -> !isClosedDeal(deal)).map(Deal::getWeightedValue).toList());
            return row(key, entry.getKey(), "quota", quota, "actual", actual, "weighted_pipeline", weighted, "forecast", actual.add(weighted));
        }).toList();
    }

    private LocalDate resolveDealDate(Deal deal) {
        if (deal.getActualCloseDate() != null) return deal.getActualCloseDate();
        if (deal.getExpectedCloseDate() != null) return deal.getExpectedCloseDate();
        return deal.getCreatedAt() != null ? deal.getCreatedAt().toLocalDate() : null;
    }

    private boolean withinRange(LocalDate date, ReportDateRangeRequestDTO range) {
        return date != null && (range.getStart() == null || !date.isBefore(range.getStart())) && (range.getEnd() == null || !date.isAfter(range.getEnd()));
    }

    private boolean isClosedDeal(Deal deal) {
        return deal.getStage() == DealStage.CLOSED_WON || deal.getStage() == DealStage.CLOSED_LOST;
    }

    private boolean isOpenCase(SupportCase supportCase) {
        return supportCase.getStatus() == SupportCaseStatus.OPEN || supportCase.getStatus() == SupportCaseStatus.IN_PROGRESS || supportCase.getStatus() == SupportCaseStatus.WAITING_ON_CUSTOMER || supportCase.getStatus() == SupportCaseStatus.ESCALATED;
    }

    private Industry companyIndustry(ReportContext context, UUID companyId) {
        Company company = context.companyMap.get(companyId);
        return company != null ? company.getIndustry() : null;
    }

    private Industry companyIndustry(ReportContext context, String companyName) {
        if (companyName == null || companyName.isBlank()) return null;
        return context.companies.stream().filter(company -> companyName.equalsIgnoreCase(company.getName())).map(Company::getIndustry).findFirst().orElse(null);
    }

    private String companyName(ReportContext context, UUID companyId) {
        Company company = context.companyMap.get(companyId);
        return company != null ? company.getName() : "Unknown";
    }

    private String campaignName(ReportContext context, UUID campaignId) {
        Campaign campaign = context.campaignMap.get(campaignId);
        return campaign != null ? campaign.getName() : "Unknown";
    }

    private String companyRegion(ReportContext context, UUID companyId) {
        Company company = context.companyMap.get(companyId);
        if (company == null) return "Unknown";
        if (company.getCountry() != null && !company.getCountry().isBlank()) {
            return company.getState() != null && !company.getState().isBlank() ? company.getCountry() + " / " + company.getState() : company.getCountry();
        }
        return "Unknown";
    }

    private Map<String, Object> detailedDealRow(ReportContext context, Deal deal) {
        Company company = context.companyMap.get(deal.getCompanyId());
        return row(
                "name", deal.getName(),
                "company", company != null ? company.getName() : "Unknown",
                "industry", label(company != null ? company.getIndustry() : null),
                "region", companyRegion(context, deal.getCompanyId()),
                "owner", context.userName(deal.getOwnerId()),
                "territory", safeText(deal.getTerritory()),
                "stage", label(deal.getStage()),
                "lead_source", safeText(deal.getLeadSource()),
                "expected_close_date", deal.getExpectedCloseDate(),
                "actual_close_date", deal.getActualCloseDate(),
                "value", money(deal.getValue()),
                "weighted_value", money(deal.getWeightedValue()),
                "_record_type", "DEAL",
                "_record_id", deal.getId(),
                "_record_path", "/deals?focus=" + deal.getId(),
                "_record_label", deal.getName()
        );
    }

    private void addMetricsTable(Document document, Map<String, Object> metrics, PdfFont bold, PdfFont regular) {
        if (metrics == null || metrics.isEmpty()) {
            return;
        }
        document.add(new Paragraph("Key Metrics").setFont(bold).setFontSize(13).setMarginBottom(8));
        Table table = new Table(UnitValue.createPercentArray(new float[]{2f, 1f})).useAllAvailableWidth();
        metrics.forEach((key, value) -> {
            table.addCell(metricCell(formatPdfLabel(key), bold, true));
            table.addCell(metricCell(formatPdfValue(value, key), regular, false));
        });
        document.add(table);
    }

    private void renderPdfSection(Document document, ReportSectionResponseDTO section, PdfFont bold, PdfFont regular) {
        if (section.getContent() instanceof List<?> contentList) {
            if (!contentList.isEmpty() && contentList.get(0) instanceof Map<?, ?>) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> rows = (List<Map<String, Object>>) section.getContent();
                addTableSection(document, sanitizeRowsForExport(rows), bold, regular);
                return;
            }
            for (Object item : contentList) {
                document.add(new Paragraph("• " + String.valueOf(item)).setFont(regular).setFontSize(10).setMarginBottom(4));
            }
            return;
        }
        if (section.getContent() instanceof Map<?, ?> contentMap) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) contentMap;
            Table table = new Table(UnitValue.createPercentArray(new float[]{2f, 1f})).useAllAvailableWidth();
            map.forEach((key, value) -> {
                table.addCell(metricCell(formatPdfLabel(key), bold, true));
                table.addCell(metricCell(formatPdfValue(value, key), regular, false));
            });
            document.add(table);
            return;
        }
        document.add(new Paragraph(String.valueOf(section.getContent())).setFont(regular).setFontSize(10));
    }

    private void addTableSection(Document document, List<Map<String, Object>> rows, PdfFont bold, PdfFont regular) {
        if (rows == null || rows.isEmpty()) {
            document.add(new Paragraph("No rows available for this section.").setFont(regular).setFontSize(10));
            return;
        }
        List<String> headers = new ArrayList<>(rows.get(0).keySet());
        Table table = new Table(UnitValue.createPercentArray(headers.size())).useAllAvailableWidth();
        headers.forEach(header -> table.addHeaderCell(headerCell(formatPdfLabel(header), bold)));
        for (Map<String, Object> row : rows) {
            for (String header : headers) {
                table.addCell(bodyCell(formatPdfValue(row.get(header), header), regular));
            }
        }
        document.add(table);
    }

    private Cell headerCell(String value, PdfFont font) {
        return new Cell()
                .add(new Paragraph(value).setFont(font).setFontSize(9))
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setBorder(Border.NO_BORDER)
                .setPadding(6);
    }

    private Cell bodyCell(String value, PdfFont font) {
        return new Cell()
                .add(new Paragraph(value).setFont(font).setFontSize(9))
                .setBorder(Border.NO_BORDER)
                .setPadding(6);
    }

    private Cell metricCell(String value, PdfFont font, boolean muted) {
        Cell cell = new Cell()
                .add(new Paragraph(value).setFont(font).setFontSize(9))
                .setBorder(Border.NO_BORDER)
                .setPadding(6);
        if (muted) {
            cell.setBackgroundColor(ColorConstants.LIGHT_GRAY);
        } else {
            cell.setTextAlignment(TextAlignment.RIGHT);
        }
        return cell;
    }

    private String formatPdfLabel(String key) {
        if (key == null) {
            return "";
        }
        String[] parts = key.replace('_', ' ').trim().split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) {
                builder.append(part.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return builder.toString();
    }

    private String formatPdfValue(Object value, String key) {
        if (value == null) {
            return "--";
        }
        if (value instanceof LocalDate date) {
            return date.toString();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toString();
        }
        if (value instanceof Number number) {
            double numberValue = number.doubleValue();
            if (isCurrencyField(key)) {
                return String.format(Locale.US, "$%,.2f", numberValue);
            }
            if (Math.rint(numberValue) == numberValue) {
                return String.format(Locale.US, "%,.0f", numberValue);
            }
            return String.format(Locale.US, "%,.2f", numberValue);
        }
        return String.valueOf(value);
    }

    private boolean isCurrencyField(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT);
        return normalized.contains("value")
                || normalized.contains("revenue")
                || normalized.contains("quota")
                || normalized.contains("forecast")
                || normalized.contains("pipeline")
                || normalized.contains("budget")
                || normalized.contains("amount")
                || normalized.contains("price")
                || normalized.contains("total")
                || normalized.contains("outstanding");
    }

    private static BigDecimal sumMoney(List<BigDecimal> values) {
        return values.stream().filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return BigDecimal.ZERO;
    }

    private static String safeText(String value) {
        return value == null || value.isBlank() ? "Unknown" : value;
    }

    private static int safeInt(Integer value) {
        return value != null ? value : 0;
    }

    private static String label(Enum<?> value) {
        return value == null ? "Unknown" : value.name().replace('_', ' ');
    }

    private static BigDecimal percentage(long numerator, long denominator) {
        return percentage(BigDecimal.valueOf(numerator), BigDecimal.valueOf(Math.max(1L, denominator)));
    }

    private static BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private ReportDateRangeRequestDTO resolveDateRange(ReportDateRangeRequestDTO range) {
        if (range == null || (range.getStart() == null && range.getEnd() == null)) {
            LocalDate end = LocalDate.now();
            return ReportDateRangeRequestDTO.builder().start(end.minusDays(30)).end(end).build();
        }
        LocalDate end = range.getEnd() != null ? range.getEnd() : LocalDate.now();
        LocalDate start = range.getStart() != null ? range.getStart() : end.minusDays(30);
        return ReportDateRangeRequestDTO.builder().start(start).end(end).build();
    }

    private String normalizeMode(String reportMode) {
        String normalized = reportMode == null ? MODE_SUMMARY : reportMode.trim().toUpperCase(Locale.ROOT);
        return SUPPORTED_MODES.contains(normalized) ? normalized : MODE_SUMMARY;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is required");
        }
        return tenantId;
    }

    private static TemplateDefinition t(String id, String category, String title) {
        return new TemplateDefinition(id, category, title);
    }

    private ReportResult placeholder(String title, String summary) {
        return new ReportResult(
                title,
                summary,
                Map.of("available", false),
                List.of(),
                List.of(summary),
                List.of("Continue wiring the backend report engine for this template."),
                List.of(ReportSectionResponseDTO.builder().title("Metrics").type("metrics").content(Map.of("available", false)).build())
        );
    }

    private record TemplateDefinition(String id, String category, String title) {}

    private record ReportResult(
            String title,
            String summary,
            Map<String, Object> metrics,
            List<Map<String, Object>> charts,
            List<String> insights,
            List<String> recommendations,
            List<ReportSectionResponseDTO> sections
    ) {}

    private static class ReportContext {
        private final List<Deal> deals;
        private final List<Lead> leads;
        private final List<Company> companies;
        private final List<Contact> contacts;
        private final List<Task> tasks;
        private final List<Event> events;
        private final List<Campaign> campaigns;
        private final List<SupportCase> supportCases;
        private final List<Quote> quotes;
        private final List<Invoice> invoices;
        private final List<Product> products;
        private final Map<UUID, User> users;
        private final List<UserSession> userSessions;
        private final List<AuditLog> auditLogs;
        private final Map<UUID, Company> companyMap;
        private final Map<UUID, Campaign> campaignMap;

        private ReportContext(
                List<Deal> deals,
                List<Lead> leads,
                List<Company> companies,
                List<Contact> contacts,
                List<Task> tasks,
                List<Event> events,
                List<Campaign> campaigns,
                List<SupportCase> supportCases,
                List<Quote> quotes,
                List<Invoice> invoices,
                List<Product> products,
                List<User> users,
                List<UserSession> userSessions,
                List<AuditLog> auditLogs
        ) {
            this.deals = deals;
            this.leads = leads;
            this.companies = companies;
            this.contacts = contacts;
            this.tasks = tasks;
            this.events = events;
            this.campaigns = campaigns;
            this.supportCases = supportCases;
            this.quotes = quotes;
            this.invoices = invoices;
            this.products = products;
            this.users = users.stream().collect(Collectors.toMap(User::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
            this.userSessions = userSessions;
            this.auditLogs = auditLogs;
            this.companyMap = companies.stream().collect(Collectors.toMap(Company::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
            this.campaignMap = campaigns.stream().collect(Collectors.toMap(Campaign::getId, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        }

        private String userName(UUID userId) {
            User user = users.get(userId);
            return user != null ? user.getFullName() : "Unassigned";
        }

        private User userByName(String fullName) {
            return users.values().stream()
                    .filter(user -> user.getFullName().equals(fullName))
                    .findFirst()
                    .orElse(null);
        }
    }
}
