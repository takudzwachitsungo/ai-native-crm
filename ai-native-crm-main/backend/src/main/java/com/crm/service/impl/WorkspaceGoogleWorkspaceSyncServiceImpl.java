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
import com.crm.service.WorkspaceGoogleWorkspaceSyncService;
import com.crm.service.WorkspaceIntegrationService;
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
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkspaceGoogleWorkspaceSyncServiceImpl implements WorkspaceGoogleWorkspaceSyncService {

    private static final String PROVIDER_KEY = "google-workspace";
    private static final String PROVIDER_NAME = "GOOGLE_WORKSPACE";

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
            JsonNode inboxList = fetchGoogleJson(integration, "/gmail/v1/users/me/messages?maxResults=25&labelIds=INBOX");
            JsonNode sentList = fetchGoogleJson(integration, "/gmail/v1/users/me/messages?maxResults=25&labelIds=SENT");

            List<JsonNode> references = new ArrayList<>();
            inboxList.path("messages").forEach(references::add);
            sentList.path("messages").forEach(references::add);

            int imported = 0;
            int updated = 0;
            int skipped = 0;
            LocalDateTime syncedAt = LocalDateTime.now();

            for (JsonNode reference : references) {
                String externalId = text(reference, "id");
                if (!StringUtils.hasText(externalId)) {
                    skipped++;
                    continue;
                }

                JsonNode message = fetchGoogleJson(integration, "/gmail/v1/users/me/messages/" + externalId + "?format=full");
                if (message == null || message.isMissingNode()) {
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

                String from = headerValue(message, "From");
                String to = headerValue(message, "To");
                String cc = headerValue(message, "Cc");
                String bcc = headerValue(message, "Bcc");
                String subject = defaultIfBlank(headerValue(message, "Subject"), "(No Subject)");
                String plainBody = defaultIfBlank(resolvePlainBody(message.path("payload")), defaultIfBlank(text(message, "snippet"), ""));
                String htmlBody = resolveHtmlBody(message.path("payload"));
                EmailFolder folder = hasLabel(message, "SENT") ? EmailFolder.SENT : EmailFolder.INBOX;
                LocalDateTime sentAt = parseGoogleEmailTimestamp(message.path("internalDate").asText(null));

                email.setTenantId(tenantId);
                email.setExternalProvider(PROVIDER_NAME);
                email.setExternalMessageId(externalId);
                email.setProviderSyncedAt(syncedAt);
                email.setSubject(subject);
                email.setBody(plainBody);
                email.setHtmlBody(htmlBody);
                email.setFromAddress(from);
                email.setToAddresses(to);
                email.setCcAddresses(cc);
                email.setBccAddresses(bcc);
                email.setIsRead(!hasLabel(message, "UNREAD"));
                email.setIsDraft(hasLabel(message, "DRAFT"));
                email.setIsSent(folder == EmailFolder.SENT);
                email.setFolder(folder);
                email.setSentAt(sentAt);

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
                    .fetchedCount(references.size())
                    .importedCount(imported)
                    .updatedCount(updated)
                    .skippedCount(skipped)
                    .summary(String.format("Imported %d emails and updated %d existing email records from Google Workspace.", imported, updated))
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
            String timeMin = OffsetDateTime.now().toString();
            JsonNode calendarEvents = fetchGoogleJson(
                    integration,
                    "/calendar/v3/calendars/primary/events?maxResults=25&singleEvents=true&orderBy=startTime&timeMin=" + urlEncode(timeMin)
            );

            List<JsonNode> events = new ArrayList<>();
            calendarEvents.path("items").forEach(events::add);

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

                LocalDateTime start = parseGoogleCalendarDateTime(eventNode.path("start"));
                LocalDateTime end = parseGoogleCalendarDateTime(eventNode.path("end"));
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
                event.setTitle(defaultIfBlank(text(eventNode, "summary"), "Calendar Event"));
                event.setDescription(text(eventNode, "description"));
                event.setEventType(resolveGoogleEventType(eventNode));
                event.setStartDateTime(start);
                event.setEndDateTime(end);
                event.setLocation(text(eventNode, "location"));
                event.setNotes(text(eventNode, "htmlLink"));

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
                    .summary(String.format("Imported %d events and updated %d existing calendar records from Google Workspace.", imported, updated))
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
                .orElseThrow(() -> new BadRequestException("Google Workspace is not configured for this workspace"));

        if (!StringUtils.hasText(integration.getAccessToken())) {
            throw new BadRequestException("Google Workspace is not connected for this workspace");
        }

        if (integration.getTokenExpiresAt() != null
                && integration.getTokenExpiresAt().isBefore(LocalDateTime.now())
                && StringUtils.hasText(integration.getRefreshToken())) {
            workspaceIntegrationService.refreshOAuthToken(PROVIDER_KEY);
            integration = workspaceIntegrationRepository
                    .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, PROVIDER_KEY)
                    .orElseThrow(() -> new BadRequestException("Google Workspace is not configured for this workspace"));
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
            WorkspaceIntegration managed = workspaceIntegrationRepository.findById(integration.getId()).orElse(integration);
            recordSyncFailure(managed, exception.getMessage());
        }
    }

    private JsonNode fetchGoogleJson(WorkspaceIntegration integration, String path) {
        try {
            String baseUrl = StringUtils.hasText(integration.getBaseUrl())
                    ? integration.getBaseUrl()
                    : "https://www.googleapis.com";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + path))
                    .header("Authorization", "Bearer " + tenantCredentialCipher.decrypt(integration.getAccessToken()))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("Google Workspace sync failed: " + response.body());
            }

            return objectMapper.readTree(response.body());
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Google Workspace sync failed");
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

    private boolean hasLabel(JsonNode message, String label) {
        for (JsonNode labelNode : message.path("labelIds")) {
            if (label.equalsIgnoreCase(labelNode.asText())) {
                return true;
            }
        }
        return false;
    }

    private String headerValue(JsonNode message, String headerName) {
        for (JsonNode header : message.path("payload").path("headers")) {
            if (headerName.equalsIgnoreCase(text(header, "name"))) {
                return text(header, "value");
            }
        }
        return null;
    }

    private String resolvePlainBody(JsonNode payload) {
        String directBody = decodeBase64Url(text(payload.path("body"), "data"));
        if (StringUtils.hasText(directBody) && !"text/html".equalsIgnoreCase(text(payload, "mimeType"))) {
            return directBody;
        }
        for (JsonNode part : payload.path("parts")) {
            String mimeType = text(part, "mimeType");
            if ("text/plain".equalsIgnoreCase(mimeType)) {
                String decoded = decodeBase64Url(text(part.path("body"), "data"));
                if (StringUtils.hasText(decoded)) {
                    return decoded;
                }
            }
            String nested = resolvePlainBody(part);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        return directBody;
    }

    private String resolveHtmlBody(JsonNode payload) {
        if ("text/html".equalsIgnoreCase(text(payload, "mimeType"))) {
            return decodeBase64Url(text(payload.path("body"), "data"));
        }
        for (JsonNode part : payload.path("parts")) {
            if ("text/html".equalsIgnoreCase(text(part, "mimeType"))) {
                String decoded = decodeBase64Url(text(part.path("body"), "data"));
                if (StringUtils.hasText(decoded)) {
                    return decoded;
                }
            }
            String nested = resolveHtmlBody(part);
            if (StringUtils.hasText(nested)) {
                return nested;
            }
        }
        return null;
    }

    private String decodeBase64Url(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            String normalized = value.replace('-', '+').replace('_', '/');
            int remainder = normalized.length() % 4;
            if (remainder > 0) {
                normalized = normalized + "=".repeat(4 - remainder);
            }
            return new String(Base64.getDecoder().decode(normalized), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private LocalDateTime parseGoogleEmailTimestamp(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            long millis = Long.parseLong(value);
            return LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private LocalDateTime parseGoogleCalendarDateTime(JsonNode node) {
        String dateTime = text(node, "dateTime");
        if (StringUtils.hasText(dateTime)) {
            try {
                return OffsetDateTime.parse(dateTime).toLocalDateTime();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
        String date = text(node, "date");
        if (StringUtils.hasText(date)) {
            try {
                return LocalDate.parse(date).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
        return null;
    }

    private EventType resolveGoogleEventType(JsonNode eventNode) {
        if (eventNode.path("hangoutLink").isTextual()) {
            return EventType.CALL;
        }
        if (eventNode.path("attendees").isArray() && eventNode.path("attendees").size() > 0) {
            return EventType.MEETING;
        }
        return EventType.OTHER;
    }

    private String defaultIfBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
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
