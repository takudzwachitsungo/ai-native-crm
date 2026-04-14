package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.entity.Company;
import com.crm.entity.Invoice;
import com.crm.entity.InvoiceLineItem;
import com.crm.entity.WorkspaceExternalSyncLink;
import com.crm.entity.WorkspaceIntegration;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CompanyRepository;
import com.crm.repository.InvoiceRepository;
import com.crm.repository.WorkspaceExternalSyncLinkRepository;
import com.crm.repository.WorkspaceIntegrationRepository;
import com.crm.service.TenantCredentialCipher;
import com.crm.service.WorkspaceErpSyncService;
import com.crm.service.WorkspaceIntegrationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkspaceErpSyncServiceImpl implements WorkspaceErpSyncService {

    private static final String ENTITY_TYPE_COMPANY = "COMPANY";
    private static final String ENTITY_TYPE_INVOICE = "INVOICE";

    private final WorkspaceIntegrationRepository workspaceIntegrationRepository;
    private final WorkspaceExternalSyncLinkRepository workspaceExternalSyncLinkRepository;
    private final WorkspaceIntegrationService workspaceIntegrationService;
    private final TenantCredentialCipher tenantCredentialCipher;
    private final CompanyRepository companyRepository;
    private final InvoiceRepository invoiceRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    @Transactional
    public IntegrationSyncResultDTO exportCompany(UUID companyId, String providerKey) {
        UUID tenantId = requireTenantId();
        String normalizedProviderKey = normalizeProviderKey(providerKey);
        Company company = companyRepository.findById(companyId)
                .filter(item -> tenantId.equals(item.getTenantId()) && !item.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        WorkspaceIntegration integration = requireConnectedIntegration(tenantId, normalizedProviderKey);
        integration.setLastSyncStartedAt(LocalDateTime.now());
        workspaceIntegrationRepository.save(integration);

        try {
            ExportOutcome outcome = exportCompanyInternal(company, integration, LocalDateTime.now());
            String summary = (outcome.created() ? "Exported " : "Updated ")
                    + "company " + company.getName() + " in " + providerDisplayName(normalizedProviderKey) + ".";
            recordSyncSuccess(integration, summary, outcome.syncedAt());
            return IntegrationSyncResultDTO.builder()
                    .providerKey(normalizedProviderKey)
                    .entityType(ENTITY_TYPE_COMPANY)
                    .fetchedCount(1)
                    .importedCount(outcome.created() ? 1 : 0)
                    .updatedCount(outcome.created() ? 0 : 1)
                    .skippedCount(0)
                    .summary(summary)
                    .syncedAt(outcome.syncedAt())
                    .build();
        } catch (RuntimeException exception) {
            recordSyncFailure(integration, exception.getMessage());
            throw exception;
        }
    }

    @Override
    @Transactional
    public IntegrationSyncResultDTO exportInvoice(UUID invoiceId, String providerKey) {
        UUID tenantId = requireTenantId();
        String normalizedProviderKey = normalizeProviderKey(providerKey);
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .filter(item -> tenantId.equals(item.getTenantId()) && !item.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));
        WorkspaceIntegration integration = requireConnectedIntegration(tenantId, normalizedProviderKey);
        integration.setLastSyncStartedAt(LocalDateTime.now());
        workspaceIntegrationRepository.save(integration);

        try {
            LocalDateTime syncedAt = LocalDateTime.now();
            WorkspaceExternalSyncLink companyLink = exportCompanyInternal(invoice.getCompany(), integration, syncedAt).link();
            ExportOutcome outcome = switch (normalizedProviderKey) {
                case "quickbooks" -> exportQuickBooksInvoice(invoice, integration, companyLink, syncedAt);
                case "xero" -> exportXeroInvoice(invoice, integration, companyLink, syncedAt);
                default -> throw new BadRequestException("ERP export is not supported for provider: " + normalizedProviderKey);
            };
            String summary = (outcome.created() ? "Exported " : "Updated ")
                    + "invoice " + invoice.getInvoiceNumber() + " in " + providerDisplayName(normalizedProviderKey) + ".";
            recordSyncSuccess(integration, summary, outcome.syncedAt());
            return IntegrationSyncResultDTO.builder()
                    .providerKey(normalizedProviderKey)
                    .entityType(ENTITY_TYPE_INVOICE)
                    .fetchedCount(1)
                    .importedCount(outcome.created() ? 1 : 0)
                    .updatedCount(outcome.created() ? 0 : 1)
                    .skippedCount(0)
                    .summary(summary)
                    .syncedAt(outcome.syncedAt())
                    .build();
        } catch (RuntimeException exception) {
            recordSyncFailure(integration, exception.getMessage());
            throw exception;
        }
    }

    private ExportOutcome exportCompanyInternal(Company company, WorkspaceIntegration integration, LocalDateTime syncedAt) {
        return switch (integration.getProviderKey()) {
            case "quickbooks" -> exportQuickBooksCompany(company, integration, syncedAt);
            case "xero" -> exportXeroCompany(company, integration, syncedAt);
            default -> throw new BadRequestException("ERP export is not supported for provider: " + integration.getProviderKey());
        };
    }

    private ExportOutcome exportQuickBooksCompany(Company company, WorkspaceIntegration integration, LocalDateTime syncedAt) {
        String realmId = requireAccountIdentifier(integration, "QuickBooks company ID");
        WorkspaceExternalSyncLink existingLink = findExistingLink(company.getTenantId(), integration.getProviderKey(), ENTITY_TYPE_COMPANY, company.getId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("DisplayName", company.getName());
        putIfText(payload.putObject("PrimaryEmailAddr"), "Address", company.getEmail());
        putIfText(payload.putObject("PrimaryPhone"), "FreeFormNumber", company.getPhone());
        putIfText(payload.putObject("WebAddr"), "URI", company.getWebsite());
        ObjectNode billAddr = payload.putObject("BillAddr");
        putIfText(billAddr, "Line1", company.getAddress());
        putIfText(billAddr, "City", company.getCity());
        putIfText(billAddr, "CountrySubDivisionCode", company.getState());
        putIfText(billAddr, "PostalCode", company.getPostalCode());
        putIfText(billAddr, "Country", company.getCountry());

        if (existingLink != null) {
            JsonNode current = sendQuickBooksRequest(integration, realmId, "/customer/" + existingLink.getExternalId(), "GET", null);
            JsonNode currentCustomer = current.path("Customer");
            payload.put("Id", existingLink.getExternalId());
            payload.put("SyncToken", text(currentCustomer, "SyncToken"));
            payload.put("sparse", true);
        }

        JsonNode response = sendQuickBooksRequest(integration, realmId, "/customer", "POST", payload);
        JsonNode customer = response.path("Customer");
        String externalId = text(customer, "Id");
        if (!StringUtils.hasText(externalId)) {
            throw new BadRequestException("QuickBooks export did not return a customer ID");
        }

        WorkspaceExternalSyncLink link = saveLink(
                company.getTenantId(),
                integration.getProviderKey(),
                ENTITY_TYPE_COMPANY,
                company.getId(),
                externalId,
                defaultIfBlank(text(customer, "DisplayName"), company.getName()),
                syncedAt
        );
        return new ExportOutcome(link, existingLink == null, syncedAt);
    }

    private ExportOutcome exportXeroCompany(Company company, WorkspaceIntegration integration, LocalDateTime syncedAt) {
        String tenantHeader = requireAccountIdentifier(integration, "Xero tenant ID");
        WorkspaceExternalSyncLink existingLink = findExistingLink(company.getTenantId(), integration.getProviderKey(), ENTITY_TYPE_COMPANY, company.getId());
        ObjectNode contact = objectMapper.createObjectNode();
        contact.put("Name", company.getName());
        putIfText(contact, "EmailAddress", company.getEmail());
        putIfText(contact, "FirstName", company.getName());
        setIfPresent(contact, "Phones", buildXeroPhones(company.getPhone()));
        setIfPresent(contact, "Addresses", buildXeroAddresses(company));
        if (existingLink != null) {
            contact.put("ContactID", existingLink.getExternalId());
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.putArray("Contacts").add(contact);

        JsonNode response = sendXeroRequest(integration, tenantHeader, "/api.xro/2.0/Contacts", payload);
        JsonNode returnedContact = response.path("Contacts").isArray() && response.path("Contacts").size() > 0
                ? response.path("Contacts").get(0)
                : null;
        String externalId = returnedContact != null ? text(returnedContact, "ContactID") : null;
        if (!StringUtils.hasText(externalId)) {
            throw new BadRequestException("Xero export did not return a contact ID");
        }

        WorkspaceExternalSyncLink link = saveLink(
                company.getTenantId(),
                integration.getProviderKey(),
                ENTITY_TYPE_COMPANY,
                company.getId(),
                externalId,
                defaultIfBlank(returnedContact != null ? text(returnedContact, "Name") : null, company.getName()),
                syncedAt
        );
        return new ExportOutcome(link, existingLink == null, syncedAt);
    }

    private ExportOutcome exportQuickBooksInvoice(
            Invoice invoice,
            WorkspaceIntegration integration,
            WorkspaceExternalSyncLink companyLink,
            LocalDateTime syncedAt
    ) {
        String realmId = requireAccountIdentifier(integration, "QuickBooks company ID");
        WorkspaceExternalSyncLink existingLink = findExistingLink(invoice.getTenantId(), integration.getProviderKey(), ENTITY_TYPE_INVOICE, invoice.getId());
        ObjectNode payload = objectMapper.createObjectNode();
        payload.putObject("CustomerRef").put("value", companyLink.getExternalId());
        putIfText(payload, "DocNumber", invoice.getInvoiceNumber());
        if (invoice.getIssueDate() != null) {
            payload.put("TxnDate", invoice.getIssueDate().toString());
        }
        if (invoice.getDueDate() != null) {
            payload.put("DueDate", invoice.getDueDate().toString());
        }
        putIfText(payload, "PrivateNote", invoice.getNotes());

        ArrayNode lines = payload.putArray("Line");
        for (InvoiceLineItem item : invoice.getItems()) {
            ObjectNode line = lines.addObject();
            line.put("Amount", safeAmount(item.getTotal()));
            line.put("DetailType", "SalesItemLineDetail");
            putIfText(line, "Description", defaultIfBlank(item.getDescription(), invoice.getInvoiceNumber()));
            ObjectNode salesDetail = line.putObject("SalesItemLineDetail");
            salesDetail.put("Qty", item.getQuantity() != null ? item.getQuantity() : 1);
            salesDetail.put("UnitPrice", safeAmount(item.getUnitPrice()));
        }

        if (existingLink != null) {
            JsonNode current = sendQuickBooksRequest(integration, realmId, "/invoice/" + existingLink.getExternalId(), "GET", null);
            JsonNode currentInvoice = current.path("Invoice");
            payload.put("Id", existingLink.getExternalId());
            payload.put("SyncToken", text(currentInvoice, "SyncToken"));
            payload.put("sparse", true);
        }

        JsonNode response = sendQuickBooksRequest(integration, realmId, "/invoice", "POST", payload);
        JsonNode exportedInvoice = response.path("Invoice");
        String externalId = text(exportedInvoice, "Id");
        if (!StringUtils.hasText(externalId)) {
            throw new BadRequestException("QuickBooks export did not return an invoice ID");
        }

        WorkspaceExternalSyncLink link = saveLink(
                invoice.getTenantId(),
                integration.getProviderKey(),
                ENTITY_TYPE_INVOICE,
                invoice.getId(),
                externalId,
                defaultIfBlank(text(exportedInvoice, "DocNumber"), invoice.getInvoiceNumber()),
                syncedAt
        );
        return new ExportOutcome(link, existingLink == null, syncedAt);
    }

    private ExportOutcome exportXeroInvoice(
            Invoice invoice,
            WorkspaceIntegration integration,
            WorkspaceExternalSyncLink companyLink,
            LocalDateTime syncedAt
    ) {
        String tenantHeader = requireAccountIdentifier(integration, "Xero tenant ID");
        WorkspaceExternalSyncLink existingLink = findExistingLink(invoice.getTenantId(), integration.getProviderKey(), ENTITY_TYPE_INVOICE, invoice.getId());
        ObjectNode invoiceNode = objectMapper.createObjectNode();
        invoiceNode.put("Type", "ACCREC");
        putIfText(invoiceNode, "InvoiceNumber", invoice.getInvoiceNumber());
        if (invoice.getIssueDate() != null) {
            invoiceNode.put("Date", invoice.getIssueDate().toString());
        }
        if (invoice.getDueDate() != null) {
            invoiceNode.put("DueDate", invoice.getDueDate().toString());
        }
        invoiceNode.putObject("Contact").put("ContactID", companyLink.getExternalId());
        invoiceNode.put("Status", mapXeroInvoiceStatus(invoice));
        putIfText(invoiceNode, "Reference", invoice.getNotes());
        if (existingLink != null) {
            invoiceNode.put("InvoiceID", existingLink.getExternalId());
        }

        ArrayNode lineItems = invoiceNode.putArray("LineItems");
        for (InvoiceLineItem item : invoice.getItems()) {
            ObjectNode line = lineItems.addObject();
            putIfText(line, "Description", defaultIfBlank(item.getDescription(), invoice.getInvoiceNumber()));
            line.put("Quantity", item.getQuantity() != null ? item.getQuantity() : 1);
            line.put("UnitAmount", safeAmount(item.getUnitPrice()));
            if (item.getProduct() != null && StringUtils.hasText(item.getProduct().getSku())) {
                line.put("ItemCode", item.getProduct().getSku());
            }
            line.put("LineAmount", safeAmount(item.getTotal()));
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.putArray("Invoices").add(invoiceNode);
        JsonNode response = sendXeroRequest(integration, tenantHeader, "/api.xro/2.0/Invoices", payload);
        JsonNode returnedInvoice = response.path("Invoices").isArray() && response.path("Invoices").size() > 0
                ? response.path("Invoices").get(0)
                : null;
        String externalId = returnedInvoice != null ? text(returnedInvoice, "InvoiceID") : null;
        if (!StringUtils.hasText(externalId)) {
            throw new BadRequestException("Xero export did not return an invoice ID");
        }

        WorkspaceExternalSyncLink link = saveLink(
                invoice.getTenantId(),
                integration.getProviderKey(),
                ENTITY_TYPE_INVOICE,
                invoice.getId(),
                externalId,
                defaultIfBlank(returnedInvoice != null ? text(returnedInvoice, "InvoiceNumber") : null, invoice.getInvoiceNumber()),
                syncedAt
        );
        return new ExportOutcome(link, existingLink == null, syncedAt);
    }

    private JsonNode sendQuickBooksRequest(
            WorkspaceIntegration integration,
            String realmId,
            String path,
            String method,
            ObjectNode payload
    ) {
        String baseUrl = StringUtils.hasText(integration.getBaseUrl())
                ? integration.getBaseUrl()
                : "https://quickbooks.api.intuit.com";
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return sendJsonRequest(baseUrl + "/v3/company/" + realmId + normalizedPath, method, integration, payload, null);
    }

    private JsonNode sendXeroRequest(
            WorkspaceIntegration integration,
            String tenantHeader,
            String path,
            ObjectNode payload
    ) {
        String baseUrl = StringUtils.hasText(integration.getBaseUrl())
                ? integration.getBaseUrl()
                : "https://api.xero.com";
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return sendJsonRequest(baseUrl + normalizedPath, "POST", integration, payload, tenantHeader);
    }

    private JsonNode sendJsonRequest(
            String url,
            String method,
            WorkspaceIntegration integration,
            ObjectNode payload,
            String xeroTenantId
    ) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + tenantCredentialCipher.decrypt(integration.getAccessToken()))
                    .header("Accept", "application/json");

            if (StringUtils.hasText(xeroTenantId)) {
                builder.header("Xero-tenant-id", xeroTenantId);
            }

            if ("GET".equalsIgnoreCase(method)) {
                builder.GET();
            } else {
                builder.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofString(payload != null ? payload.toString() : ""));
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("ERP sync failed: " + response.body());
            }
            return objectMapper.readTree(response.body());
        } catch (BadRequestException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BadRequestException("ERP sync failed");
        }
    }

    private WorkspaceIntegration requireConnectedIntegration(UUID tenantId, String providerKey) {
        WorkspaceIntegration integration = workspaceIntegrationRepository
                .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, providerKey)
                .orElseThrow(() -> new BadRequestException(providerDisplayName(providerKey) + " is not configured for this workspace"));

        if (!StringUtils.hasText(integration.getAccessToken())) {
            throw new BadRequestException(providerDisplayName(providerKey) + " is not connected for this workspace");
        }

        if (integration.getTokenExpiresAt() != null
                && integration.getTokenExpiresAt().isBefore(LocalDateTime.now())
                && StringUtils.hasText(integration.getRefreshToken())) {
            workspaceIntegrationService.refreshOAuthToken(providerKey);
            integration = workspaceIntegrationRepository
                    .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, providerKey)
                    .orElseThrow(() -> new BadRequestException(providerDisplayName(providerKey) + " is not configured for this workspace"));
        }

        return integration;
    }

    private WorkspaceExternalSyncLink findExistingLink(UUID tenantId, String providerKey, String entityType, UUID localEntityId) {
        return workspaceExternalSyncLinkRepository
                .findByTenantIdAndProviderKeyAndEntityTypeAndLocalEntityIdAndArchivedFalse(tenantId, providerKey, entityType, localEntityId)
                .orElse(null);
    }

    private WorkspaceExternalSyncLink saveLink(
            UUID tenantId,
            String providerKey,
            String entityType,
            UUID localEntityId,
            String externalId,
            String externalName,
            LocalDateTime syncedAt
    ) {
        WorkspaceExternalSyncLink link = workspaceExternalSyncLinkRepository
                .findByTenantIdAndProviderKeyAndEntityTypeAndLocalEntityIdAndArchivedFalse(tenantId, providerKey, entityType, localEntityId)
                .orElseGet(WorkspaceExternalSyncLink::new);

        link.setTenantId(tenantId);
        link.setProviderKey(providerKey);
        link.setEntityType(entityType);
        link.setLocalEntityId(localEntityId);
        link.setExternalId(externalId);
        link.setExternalName(externalName);
        link.setLastSyncedAt(syncedAt);
        return workspaceExternalSyncLinkRepository.save(link);
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("No tenant context available");
        }
        return tenantId;
    }

    private String normalizeProviderKey(String providerKey) {
        String normalized = providerKey == null ? null : providerKey.trim().toLowerCase();
        if (!"quickbooks".equals(normalized) && !"xero".equals(normalized)) {
            throw new BadRequestException("Unsupported ERP provider: " + providerKey);
        }
        return normalized;
    }

    private String providerDisplayName(String providerKey) {
        return switch (providerKey) {
            case "quickbooks" -> "QuickBooks";
            case "xero" -> "Xero";
            default -> providerKey;
        };
    }

    private String requireAccountIdentifier(WorkspaceIntegration integration, String label) {
        if (!StringUtils.hasText(integration.getAccountIdentifier())) {
            throw new BadRequestException(label + " must be saved before ERP sync can run");
        }
        return integration.getAccountIdentifier().trim();
    }

    private String text(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText(null);
        return StringUtils.hasText(value) ? value : null;
    }

    private void putIfText(ObjectNode node, String fieldName, String value) {
        if (StringUtils.hasText(value)) {
            node.put(fieldName, value.trim());
        }
    }

    private void setIfPresent(ObjectNode node, String fieldName, JsonNode value) {
        if (value != null && !value.isNull()) {
            node.set(fieldName, value);
        }
    }

    private JsonNode buildXeroPhones(String phone) {
        if (!StringUtils.hasText(phone)) {
            return null;
        }
        ArrayNode phones = objectMapper.createArrayNode();
        ObjectNode item = phones.addObject();
        item.put("PhoneType", "DEFAULT");
        item.put("PhoneNumber", phone.trim());
        return phones;
    }

    private JsonNode buildXeroAddresses(Company company) {
        if (!StringUtils.hasText(company.getAddress())
                && !StringUtils.hasText(company.getCity())
                && !StringUtils.hasText(company.getState())
                && !StringUtils.hasText(company.getPostalCode())
                && !StringUtils.hasText(company.getCountry())) {
            return null;
        }
        ArrayNode addresses = objectMapper.createArrayNode();
        ObjectNode item = addresses.addObject();
        item.put("AddressType", "STREET");
        putIfText(item, "AddressLine1", company.getAddress());
        putIfText(item, "City", company.getCity());
        putIfText(item, "Region", company.getState());
        putIfText(item, "PostalCode", company.getPostalCode());
        putIfText(item, "Country", company.getCountry());
        return addresses;
    }

    private String defaultIfBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private double safeAmount(BigDecimal value) {
        return value != null ? value.doubleValue() : BigDecimal.ZERO.doubleValue();
    }

    private String mapXeroInvoiceStatus(Invoice invoice) {
        return switch (invoice.getStatus()) {
            case PAID, SENT, OVERDUE -> "AUTHORISED";
            case CANCELLED -> "VOIDED";
            default -> "DRAFT";
        };
    }

    private void recordSyncSuccess(WorkspaceIntegration integration, String message, LocalDateTime syncedAt) {
        integration.setLastSyncSucceeded(true);
        integration.setLastSyncedAt(syncedAt);
        integration.setLastSyncMessage(message);
        workspaceIntegrationRepository.save(integration);
        meterRegistry.counter("crm.integrations.sync.total", "provider", normalizeProviderKey(integration.getProviderKey()), "result", "success").increment();
    }

    private void recordSyncFailure(WorkspaceIntegration integration, String message) {
        integration.setLastSyncSucceeded(false);
        integration.setLastSyncMessage(StringUtils.hasText(message) ? message : "Integration sync failed");
        workspaceIntegrationRepository.save(integration);
        meterRegistry.counter("crm.integrations.sync.total", "provider", normalizeProviderKey(integration.getProviderKey()), "result", "failure").increment();
    }

    private record ExportOutcome(
            WorkspaceExternalSyncLink link,
            boolean created,
            LocalDateTime syncedAt
    ) {
    }
}
