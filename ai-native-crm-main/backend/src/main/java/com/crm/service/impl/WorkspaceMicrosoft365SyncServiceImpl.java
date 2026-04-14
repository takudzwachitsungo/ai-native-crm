package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.entity.Email;
import com.crm.entity.Event;
import com.crm.entity.WorkspaceIntegration;
import com.crm.entity.enums.EmailFolder;
import com.crm.entity.enums.EventType;
import com.crm.exception.BadRequestException;
import com.crm.repository.EmailRepository;
import com.crm.repository.EventRepository;
import com.crm.repository.WorkspaceIntegrationRepository;
import com.crm.service.TenantCredentialCipher;
import com.crm.service.WorkspaceIntegrationService;
import com.crm.service.WorkspaceMicrosoft365SyncService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkspaceMicrosoft365SyncServiceImpl implements WorkspaceMicrosoft365SyncService {

    private static final String PROVIDER_KEY = "microsoft-365";
    private static final String PROVIDER_NAME = "MICROSOFT_365";

    private final WorkspaceIntegrationRepository workspaceIntegrationRepository;
    private final WorkspaceIntegrationService workspaceIntegrationService;
    private final TenantCredentialCipher tenantCredentialCipher;
    private final EmailRepository emailRepository;
    private final EventRepository eventRepository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    @Transactional
    public IntegrationSyncResultDTO syncEmails() {
        UUID tenantId = requireTenantId();
        WorkspaceIntegration integration = requireConnectedIntegration(tenantId);
        integration.setLastSyncStartedAt(LocalDateTime.now());
        workspaceIntegrationRepository.save(integration);

        try {
            JsonNode inboxMessages = fetchGraphCollection(integration, "/v1.0/me/mailFolders/inbox/messages?$top=25&$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,isRead,receivedDateTime,sentDateTime");
            JsonNode sentMessages = fetchGraphCollection(integration, "/v1.0/me/mailFolders/sentitems/messages?$top=25&$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,isRead,receivedDateTime,sentDateTime");

            List<JsonNode> allMessages = new ArrayList<>();
            inboxMessages.path("value").forEach(allMessages::add);
            sentMessages.path("value").forEach(allMessages::add);

            int imported = 0;
            int updated = 0;
            int skipped = 0;
            LocalDateTime syncedAt = LocalDateTime.now();

            for (JsonNode message : allMessages) {
                String externalId = text(message, "id");
                if (!StringUtils.hasText(externalId)) {
                    skipped++;
                    continue;
                }

                Optional<Email> existing = emailRepository.findByTenantIdAndExternalProviderAndExternalMessageIdAndArchivedFalse(
                        tenantId,
                        PROVIDER_NAME,
                        externalId
                );

                Email email = existing.orElseGet(Email::new);
                boolean wasExisting = existing.isPresent();

                email.setTenantId(tenantId);
                email.setExternalProvider(PROVIDER_NAME);
                email.setExternalMessageId(externalId);
                email.setProviderSyncedAt(syncedAt);
                email.setSubject(defaultIfBlank(text(message, "subject"), "(No Subject)"));
                email.setBody(resolveEmailBody(message));
                email.setHtmlBody(resolveEmailHtmlBody(message));
                email.setFromAddress(text(message.path("from").path("emailAddress"), "address"));
                email.setToAddresses(joinRecipientAddresses(message.path("toRecipients")));
                email.setCcAddresses(joinRecipientAddresses(message.path("ccRecipients")));
                email.setBccAddresses(joinRecipientAddresses(message.path("bccRecipients")));
                email.setIsRead(message.path("isRead").asBoolean(false));
                email.setIsDraft(false);
                email.setIsSent(wasMessageSent(message));
                email.setFolder(wasMessageSent(message) ? EmailFolder.SENT : EmailFolder.INBOX);
                email.setSentAt(parseGraphDateTime(text(message, "sentDateTime")));

                emailRepository.save(email);
                if (wasExisting) {
                    updated++;
                } else {
                    imported++;
                }
            }

            IntegrationSyncResultDTO result = IntegrationSyncResultDTO.builder()
                    .providerKey(PROVIDER_KEY)
                    .entityType("EMAIL")
                    .fetchedCount(allMessages.size())
                    .importedCount(imported)
                    .updatedCount(updated)
                    .skippedCount(skipped)
                    .summary(String.format("Imported %d emails and updated %d existing email records from Microsoft 365.", imported, updated))
                    .syncedAt(syncedAt)
                    .build();
            recordSyncSuccess(integration, result.getSummary(), result.getSyncedAt());
            return result;
        } catch (RuntimeException exception) {
            recordSyncFailure(integration, exception.getMessage());
            throw exception;
        }
    }

    @Override
    @Transactional
    public IntegrationSyncResultDTO syncEvents() {
        UUID tenantId = requireTenantId();
        WorkspaceIntegration integration = requireConnectedIntegration(tenantId);
        integration.setLastSyncStartedAt(LocalDateTime.now());
        workspaceIntegrationRepository.save(integration);

        try {
            JsonNode eventsNode = fetchGraphCollection(integration, "/v1.0/me/events?$top=25&$select=id,subject,body,bodyPreview,start,end,location,isAllDay,onlineMeeting,webLink");
            List<JsonNode> events = new ArrayList<>();
            eventsNode.path("value").forEach(events::add);

            int imported = 0;
            int updated = 0;
            int skipped = 0;
            LocalDateTime syncedAt = LocalDateTime.now();

            for (JsonNode eventNode : events) {
                String externalId = text(eventNode, "id");
                if (!StringUtils.hasText(externalId)) {
                    skipped++;
                    continue;
                }

                LocalDateTime start = parseGraphDateTime(text(eventNode.path("start"), "dateTime"));
                LocalDateTime end = parseGraphDateTime(text(eventNode.path("end"), "dateTime"));
                if (start == null || end == null) {
                    skipped++;
                    continue;
                }

                Optional<Event> existing = eventRepository.findByTenantIdAndExternalProviderAndExternalEventIdAndArchivedFalse(
                        tenantId,
                        PROVIDER_NAME,
                        externalId
                );

                Event event = existing.orElseGet(Event::new);
                boolean wasExisting = existing.isPresent();

                event.setTenantId(tenantId);
                event.setExternalProvider(PROVIDER_NAME);
                event.setExternalEventId(externalId);
                event.setProviderSyncedAt(syncedAt);
                event.setTitle(defaultIfBlank(text(eventNode, "subject"), "Calendar Event"));
                event.setDescription(resolveEventDescription(eventNode));
                event.setEventType(resolveEventType(eventNode));
                event.setStartDateTime(start);
                event.setEndDateTime(end);
                event.setLocation(text(eventNode.path("location"), "displayName"));
                event.setNotes(text(eventNode, "webLink"));

                eventRepository.save(event);
                if (wasExisting) {
                    updated++;
                } else {
                    imported++;
                }
            }

            IntegrationSyncResultDTO result = IntegrationSyncResultDTO.builder()
                    .providerKey(PROVIDER_KEY)
                    .entityType("EVENT")
                    .fetchedCount(events.size())
                    .importedCount(imported)
                    .updatedCount(updated)
                    .skippedCount(skipped)
                    .summary(String.format("Imported %d events and updated %d existing calendar records from Microsoft 365.", imported, updated))
                    .syncedAt(syncedAt)
                    .build();
            recordSyncSuccess(integration, result.getSummary(), result.getSyncedAt());
            return result;
        } catch (RuntimeException exception) {
            recordSyncFailure(integration, exception.getMessage());
            throw exception;
        }
    }

    @Override
    @Transactional
    public void runScheduledMaintenance() {
        UUID tenantId = requireTenantId();
        List<WorkspaceIntegration> integrations = workspaceIntegrationRepository.findByTenantIdAndArchivedFalse(tenantId);

        integrations.stream()
                .filter(integration -> PROVIDER_KEY.equals(integration.getProviderKey()))
                .filter(integration -> Boolean.TRUE.equals(integration.getIsActive()))
                .filter(integration -> Boolean.TRUE.equals(integration.getSyncEnabled()))
                .forEach(this::maintainIntegrationSafely);
    }

    private WorkspaceIntegration requireConnectedIntegration(UUID tenantId) {
        WorkspaceIntegration integration = workspaceIntegrationRepository
                .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, PROVIDER_KEY)
                .orElseThrow(() -> new BadRequestException("Microsoft 365 is not configured for this workspace"));

        if (!StringUtils.hasText(integration.getAccessToken())) {
            throw new BadRequestException("Microsoft 365 is not connected for this workspace");
        }

        if (integration.getTokenExpiresAt() != null
                && integration.getTokenExpiresAt().isBefore(LocalDateTime.now())
                && StringUtils.hasText(integration.getRefreshToken())) {
            workspaceIntegrationService.refreshOAuthToken(PROVIDER_KEY);
            integration = workspaceIntegrationRepository
                    .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, PROVIDER_KEY)
                    .orElseThrow(() -> new BadRequestException("Microsoft 365 is not configured for this workspace"));
        }

        return integration;
    }

    private void maintainIntegrationSafely(WorkspaceIntegration integration) {
        try {
            if (!StringUtils.hasText(integration.getAccessToken())) {
                return;
            }

            if (integration.getTokenExpiresAt() != null
                    && integration.getTokenExpiresAt().isBefore(LocalDateTime.now().plusMinutes(15))
                    && StringUtils.hasText(integration.getRefreshToken())) {
                workspaceIntegrationService.refreshOAuthToken(PROVIDER_KEY);
            }

            syncEmails();
            syncEvents();
        } catch (RuntimeException exception) {
            WorkspaceIntegration managed = workspaceIntegrationRepository
                    .findById(integration.getId())
                    .orElse(integration);
            recordSyncFailure(managed, exception.getMessage());
        }
    }

    private JsonNode fetchGraphCollection(WorkspaceIntegration integration, String path) {
        try {
            String baseUrl = StringUtils.hasText(integration.getBaseUrl())
                    ? integration.getBaseUrl()
                    : "https://graph.microsoft.com";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + path))
                    .header("Authorization", "Bearer " + tenantCredentialCipher.decrypt(integration.getAccessToken()))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("Microsoft 365 sync failed: " + response.body());
            }

            return objectMapper.readTree(response.body());
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Microsoft 365 sync failed");
        }
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("No tenant context available");
        }
        return tenantId;
    }

    private String text(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText(null);
        return StringUtils.hasText(value) ? value : null;
    }

    private String joinRecipientAddresses(JsonNode recipients) {
        if (recipients == null || !recipients.isArray() || recipients.isEmpty()) {
            return null;
        }
        List<String> addresses = new ArrayList<>();
        recipients.forEach(item -> {
            String address = text(item.path("emailAddress"), "address");
            if (StringUtils.hasText(address)) {
                addresses.add(address);
            }
        });
        return addresses.isEmpty() ? null : String.join(", ", addresses);
    }

    private String resolveEmailBody(JsonNode message) {
        String content = text(message.path("body"), "content");
        if (StringUtils.hasText(content)) {
            return content;
        }
        return defaultIfBlank(text(message, "bodyPreview"), "");
    }

    private String resolveEmailHtmlBody(JsonNode message) {
        String contentType = text(message.path("body"), "contentType");
        String content = text(message.path("body"), "content");
        if ("html".equalsIgnoreCase(contentType) && StringUtils.hasText(content)) {
            return content;
        }
        return null;
    }

    private boolean wasMessageSent(JsonNode message) {
        return StringUtils.hasText(text(message, "sentDateTime"));
    }

    private String resolveEventDescription(JsonNode eventNode) {
        String content = text(eventNode.path("body"), "content");
        if (StringUtils.hasText(content)) {
            return content;
        }
        return text(eventNode, "bodyPreview");
    }

    private EventType resolveEventType(JsonNode eventNode) {
        if (eventNode.path("isAllDay").asBoolean(false)) {
            return EventType.OTHER;
        }
        if (!eventNode.path("onlineMeeting").isMissingNode() && !eventNode.path("onlineMeeting").isNull()) {
            return EventType.CALL;
        }
        return EventType.MEETING;
    }

    private LocalDateTime parseGraphDateTime(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return OffsetDateTime.parse(value).toLocalDateTime();
    }

    private String defaultIfBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private void recordSyncSuccess(WorkspaceIntegration integration, String message, LocalDateTime syncedAt) {
        integration.setLastSyncSucceeded(true);
        integration.setLastSyncedAt(syncedAt);
        integration.setLastSyncMessage(message);
        workspaceIntegrationRepository.save(integration);
        meterRegistry.counter("crm.integrations.sync.total", "provider", PROVIDER_KEY, "result", "success").increment();
    }

    private void recordSyncFailure(WorkspaceIntegration integration, String message) {
        integration.setLastSyncSucceeded(false);
        integration.setLastSyncMessage(StringUtils.hasText(message) ? message : "Integration sync failed");
        workspaceIntegrationRepository.save(integration);
        meterRegistry.counter("crm.integrations.sync.total", "provider", PROVIDER_KEY, "result", "failure").increment();
    }
}
