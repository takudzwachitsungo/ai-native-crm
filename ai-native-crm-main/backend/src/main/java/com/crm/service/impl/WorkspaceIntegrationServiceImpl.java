package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.WorkspaceIntegrationOAuthExchangeRequestDTO;
import com.crm.dto.request.WorkspaceIntegrationUpdateRequestDTO;
import com.crm.dto.response.WorkspaceIntegrationOAuthStartResponseDTO;
import com.crm.dto.response.WorkspaceIntegrationResponseDTO;
import com.crm.entity.WorkspaceIntegration;
import com.crm.exception.BadRequestException;
import com.crm.repository.WorkspaceIntegrationRepository;
import com.crm.service.TenantCredentialCipher;
import com.crm.service.WorkspaceIntegrationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkspaceIntegrationServiceImpl implements WorkspaceIntegrationService {

    private final WorkspaceIntegrationRepository workspaceIntegrationRepository;
    private final TenantCredentialCipher tenantCredentialCipher;
    private final Environment environment;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public WorkspaceIntegrationServiceImpl(
            WorkspaceIntegrationRepository workspaceIntegrationRepository,
            TenantCredentialCipher tenantCredentialCipher,
            Environment environment,
            ObjectMapper objectMapper
    ) {
        this.workspaceIntegrationRepository = workspaceIntegrationRepository;
        this.tenantCredentialCipher = tenantCredentialCipher;
        this.environment = environment;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceIntegrationResponseDTO> getCurrentTenantIntegrations() {
        UUID tenantId = requireTenantId();
        Map<String, IntegrationTemplate> templates = integrationTemplates();
        Map<String, WorkspaceIntegration> existing = new LinkedHashMap<>();

        workspaceIntegrationRepository.findByTenantIdAndArchivedFalseOrderByNameAsc(tenantId)
                .forEach(item -> existing.put(item.getProviderKey(), item));

        List<WorkspaceIntegrationResponseDTO> response = new ArrayList<>();
        templates.forEach((key, template) -> response.add(toResponse(template, existing.get(key))));
        return response;
    }

    @Override
    @Transactional
    public WorkspaceIntegrationResponseDTO updateCurrentTenantIntegration(String providerKey, WorkspaceIntegrationUpdateRequestDTO request) {
        UUID tenantId = requireTenantId();
        IntegrationTemplate template = requireEditableTemplate(providerKey);
        WorkspaceIntegration integration = getOrCreateIntegration(tenantId, template);

        integration.setName(template.name());
        integration.setCategory(template.category());
        integration.setProviderType(template.providerType());
        integration.setAuthType(normalize(request.getAuthType()));
        integration.setBaseUrl(normalize(request.getBaseUrl()));
        integration.setClientId(normalize(request.getClientId()));
        integration.setAccountIdentifier(normalize(request.getAccountIdentifier()));
        integration.setRedirectUri(normalize(request.getRedirectUri()));
        integration.setScopes(normalize(request.getScopes()));
        integration.setSyncEnabled(Boolean.TRUE.equals(request.getSyncEnabled()));
        integration.setIsActive(Boolean.TRUE.equals(request.getActive()));

        if (StringUtils.hasText(request.getClientSecret())) {
            integration.setClientSecret(tenantCredentialCipher.encrypt(request.getClientSecret().trim()));
        }

        integration.setLastValidatedAt(LocalDateTime.now());
        integration.setLastValidationSucceeded(isConfigured(integration));
        integration.setLastValidationMessage(buildValidationMessage(template, integration));

        WorkspaceIntegration saved = workspaceIntegrationRepository.save(integration);
        return toResponse(template, saved);
    }

    @Override
    @Transactional
    public WorkspaceIntegrationOAuthStartResponseDTO startOAuth(String providerKey) {
        UUID tenantId = requireTenantId();
        IntegrationTemplate template = requireEditableTemplate(providerKey);
        if (!"OAUTH2".equalsIgnoreCase(template.defaultAuthType())) {
            throw new BadRequestException("OAuth start is only supported for OAuth-based integrations");
        }

        WorkspaceIntegration integration = getOrCreateIntegration(tenantId, template);
        if (!isConfigured(integration)) {
            throw new BadRequestException("Save the connector client ID and secret before starting OAuth");
        }
        if (!StringUtils.hasText(integration.getRedirectUri())) {
            throw new BadRequestException("Save a redirect URI before starting OAuth");
        }
        if (!StringUtils.hasText(template.authorizationEndpoint())) {
            throw new BadRequestException("This integration does not have an OAuth authorization endpoint configured");
        }

        String state = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(10);
        integration.setOauthState(tenantCredentialCipher.encrypt(state));
        integration.setOauthStateExpiresAt(expiresAt);
        workspaceIntegrationRepository.save(integration);

        String authorizationUrl = buildAuthorizationUrl(template, integration, state);
        return WorkspaceIntegrationOAuthStartResponseDTO.builder()
                .providerKey(providerKey)
                .authorizationUrl(authorizationUrl)
                .state(state)
                .expiresAt(expiresAt)
                .build();
    }

    @Override
    @Transactional
    public WorkspaceIntegrationResponseDTO exchangeOAuthCode(String providerKey, WorkspaceIntegrationOAuthExchangeRequestDTO request) {
        UUID tenantId = requireTenantId();
        IntegrationTemplate template = requireEditableTemplate(providerKey);
        WorkspaceIntegration integration = getOrCreateIntegration(tenantId, template);

        validateOAuthState(integration, request.getState());
        if (!StringUtils.hasText(template.tokenEndpoint())) {
            throw new BadRequestException("This integration does not have an OAuth token endpoint configured");
        }
        if (!StringUtils.hasText(integration.getClientId()) || !StringUtils.hasText(integration.getClientSecret())) {
            throw new BadRequestException("Connector credentials must be configured before exchanging an OAuth code");
        }
        if (!StringUtils.hasText(integration.getRedirectUri())) {
            throw new BadRequestException("Redirect URI is required before exchanging an OAuth code");
        }

        OAuthTokenResponse tokenResponse = exchangeAuthorizationCode(template, integration, request.getCode());
        integration.setAccessToken(tenantCredentialCipher.encrypt(tokenResponse.accessToken()));
        integration.setRefreshToken(StringUtils.hasText(tokenResponse.refreshToken())
                ? tenantCredentialCipher.encrypt(tokenResponse.refreshToken())
                : null);
        integration.setTokenType(tokenResponse.tokenType());
        integration.setTokenExpiresAt(tokenResponse.expiresAt());
        integration.setConnectedAt(LocalDateTime.now());
        integration.setOauthState(null);
        integration.setOauthStateExpiresAt(null);
        integration.setIsActive(true);
        integration.setLastValidatedAt(LocalDateTime.now());
        integration.setLastValidationSucceeded(true);
        integration.setLastValidationMessage(template.name() + " OAuth connection established successfully.");

        WorkspaceIntegration saved = workspaceIntegrationRepository.save(integration);
        return toResponse(template, saved);
    }

    @Override
    @Transactional
    public WorkspaceIntegrationResponseDTO refreshOAuthToken(String providerKey) {
        UUID tenantId = requireTenantId();
        IntegrationTemplate template = requireEditableTemplate(providerKey);
        WorkspaceIntegration integration = workspaceIntegrationRepository
                .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, providerKey)
                .orElseThrow(() -> new BadRequestException("No integration configuration exists for this provider"));

        if (!StringUtils.hasText(template.tokenEndpoint())) {
            throw new BadRequestException("This integration does not support OAuth token refresh");
        }
        if (!StringUtils.hasText(integration.getRefreshToken())) {
            throw new BadRequestException("No refresh token is stored for this integration");
        }
        if (!StringUtils.hasText(integration.getClientId()) || !StringUtils.hasText(integration.getClientSecret())) {
            throw new BadRequestException("Connector credentials must be configured before refreshing a token");
        }

        OAuthTokenResponse tokenResponse = refreshStoredToken(template, integration);
        integration.setAccessToken(tenantCredentialCipher.encrypt(tokenResponse.accessToken()));
        integration.setRefreshToken(StringUtils.hasText(tokenResponse.refreshToken())
                ? tenantCredentialCipher.encrypt(tokenResponse.refreshToken())
                : integration.getRefreshToken());
        integration.setTokenType(tokenResponse.tokenType());
        integration.setTokenExpiresAt(tokenResponse.expiresAt());
        integration.setConnectedAt(LocalDateTime.now());
        integration.setIsActive(true);
        integration.setLastValidatedAt(LocalDateTime.now());
        integration.setLastValidationSucceeded(true);
        integration.setLastValidationMessage(template.name() + " access token refreshed successfully.");

        WorkspaceIntegration saved = workspaceIntegrationRepository.save(integration);
        return toResponse(template, saved);
    }

    private WorkspaceIntegrationResponseDTO toResponse(IntegrationTemplate template, WorkspaceIntegration integration) {
        boolean connected = integration != null && StringUtils.hasText(integration.getAccessToken()) && integration.getConnectedAt() != null;
        boolean configured = integration != null && isConfigured(integration);
        String status = connected ? "ACTIVE" : configured ? "CONFIGURED" : template.defaultStatus();
        String detail = connected
                ? buildConnectedDetail(template, integration)
                : configured
                ? buildConfiguredDetail(template, integration)
                : template.detail();

        return WorkspaceIntegrationResponseDTO.builder()
                .id(integration != null ? integration.getId() : null)
                .key(template.key())
                .name(template.name())
                .category(template.category())
                .providerType(template.providerType())
                .status(status)
                .description(template.description())
                .detail(detail)
                .editable(template.editable())
                .authType(integration != null ? integration.getAuthType() : template.defaultAuthType())
                .baseUrl(integration != null ? integration.getBaseUrl() : template.defaultBaseUrl())
                .clientId(integration != null ? integration.getClientId() : null)
                .clientIdConfigured(integration != null && StringUtils.hasText(integration.getClientId()))
                .clientSecretConfigured(integration != null && StringUtils.hasText(integration.getClientSecret()))
                .accountIdentifier(integration != null ? integration.getAccountIdentifier() : null)
                .redirectUri(integration != null ? integration.getRedirectUri() : template.defaultRedirectUri())
                .scopes(integration != null ? integration.getScopes() : template.defaultScopes())
                .syncEnabled(integration != null ? Boolean.TRUE.equals(integration.getSyncEnabled()) : false)
                .active(integration != null ? Boolean.TRUE.equals(integration.getIsActive()) : false)
                .lastValidatedAt(integration != null ? integration.getLastValidatedAt() : null)
                .lastValidationSucceeded(integration != null ? integration.getLastValidationSucceeded() : null)
                .lastValidationMessage(resolveValidationMessage(template, integration))
                .connected(connected)
                .connectedAt(integration != null ? integration.getConnectedAt() : null)
                .tokenExpiresAt(integration != null ? integration.getTokenExpiresAt() : null)
                .oauthReady(template.editable()
                        && "OAUTH2".equalsIgnoreCase(integration != null ? integration.getAuthType() : template.defaultAuthType())
                        && configured
                        && StringUtils.hasText(integration != null ? integration.getRedirectUri() : template.defaultRedirectUri()))
                .lastSyncStartedAt(integration != null ? integration.getLastSyncStartedAt() : null)
                .lastSyncedAt(integration != null ? integration.getLastSyncedAt() : null)
                .lastSyncSucceeded(integration != null ? integration.getLastSyncSucceeded() : null)
                .lastSyncMessage(integration != null ? integration.getLastSyncMessage() : null)
                .build();
    }

    private boolean isConfigured(WorkspaceIntegration integration) {
        if ("API_KEY".equalsIgnoreCase(integration.getAuthType())) {
            return StringUtils.hasText(integration.getClientSecret());
        }
        return StringUtils.hasText(integration.getClientId()) && StringUtils.hasText(integration.getClientSecret());
    }

    private String buildValidationMessage(IntegrationTemplate template, WorkspaceIntegration integration) {
        if (isConfigured(integration)) {
            return template.name() + " configuration saved. Complete OAuth to connect this workspace and enable live sync.";
        }
        return "Configuration saved in draft mode. Provide the required credentials before this connector can be treated as configured.";
    }

    private String resolveValidationMessage(IntegrationTemplate template, WorkspaceIntegration integration) {
        if (integration == null) {
            return null;
        }
        if (Boolean.TRUE.equals(integration.getLastValidationSucceeded()) && isConfigured(integration)) {
            return buildValidationMessage(template, integration);
        }
        return integration.getLastValidationMessage();
    }

    private String buildConfiguredDetail(IntegrationTemplate template, WorkspaceIntegration integration) {
        StringBuilder detail = new StringBuilder(template.name())
                .append(" workspace configuration is saved");

        if (StringUtils.hasText(integration.getAccountIdentifier())) {
            detail.append(" for ").append(integration.getAccountIdentifier());
        }

        if (StringUtils.hasText(integration.getRedirectUri())) {
            detail.append(". Redirect URI: ").append(integration.getRedirectUri());
        } else {
            detail.append(".");
        }

        detail.append(" Complete OAuth to connect this workspace, then use live sync to import provider data.");
        return detail.toString();
    }

    private String buildConnectedDetail(IntegrationTemplate template, WorkspaceIntegration integration) {
        StringBuilder detail = new StringBuilder(template.name())
                .append(" is connected for this workspace");
        if (StringUtils.hasText(integration.getAccountIdentifier())) {
            detail.append(" (").append(integration.getAccountIdentifier()).append(")");
        }
        detail.append(".");
        if (integration.getTokenExpiresAt() != null) {
            detail.append(" Token expires at ").append(integration.getTokenExpiresAt()).append(".");
        }
        return detail.toString();
    }

    private IntegrationTemplate requireEditableTemplate(String providerKey) {
        IntegrationTemplate template = integrationTemplates().get(providerKey);
        if (template == null) {
            throw new BadRequestException("Unknown workspace integration provider");
        }
        if (!template.editable()) {
            throw new BadRequestException("This integration is managed by the platform and cannot be edited here");
        }
        return template;
    }

    private WorkspaceIntegration getOrCreateIntegration(UUID tenantId, IntegrationTemplate template) {
        return workspaceIntegrationRepository
                .findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, template.key())
                .orElseGet(() -> {
                    WorkspaceIntegration created = WorkspaceIntegration.builder()
                            .providerKey(template.key())
                            .name(template.name())
                            .category(template.category())
                            .providerType(template.providerType())
                            .authType(template.defaultAuthType())
                            .baseUrl(template.defaultBaseUrl())
                            .redirectUri(template.defaultRedirectUri())
                            .scopes(template.defaultScopes())
                            .build();
                    created.setTenantId(tenantId);
                    return created;
                });
    }

    private void validateOAuthState(WorkspaceIntegration integration, String providedState) {
        if (!StringUtils.hasText(integration.getOauthState()) || integration.getOauthStateExpiresAt() == null) {
            throw new BadRequestException("No OAuth state is active for this integration");
        }
        if (integration.getOauthStateExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OAuth state has expired. Start the OAuth flow again");
        }
        String expectedState = tenantCredentialCipher.decrypt(integration.getOauthState());
        if (!providedState.equals(expectedState)) {
            throw new BadRequestException("OAuth state mismatch");
        }
    }

    private String buildAuthorizationUrl(IntegrationTemplate template, WorkspaceIntegration integration, String state) {
        return template.authorizationEndpoint()
                + "?response_type=code"
                + "&client_id=" + urlEncode(integration.getClientId())
                + "&redirect_uri=" + urlEncode(integration.getRedirectUri())
                + "&scope=" + urlEncode(StringUtils.hasText(integration.getScopes()) ? integration.getScopes() : template.defaultScopes())
                + "&state=" + urlEncode(state)
                + ("google-workspace".equals(template.key()) ? "&access_type=offline&prompt=consent" : "");
    }

    private OAuthTokenResponse exchangeAuthorizationCode(IntegrationTemplate template, WorkspaceIntegration integration, String code) {
        try {
            String form = "grant_type=authorization_code"
                    + "&code=" + urlEncode(code)
                    + "&client_id=" + urlEncode(integration.getClientId())
                    + "&client_secret=" + urlEncode(tenantCredentialCipher.decrypt(integration.getClientSecret()))
                    + "&redirect_uri=" + urlEncode(integration.getRedirectUri());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(template.tokenEndpoint()))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("OAuth token exchange failed: " + response.body());
            }

            JsonNode node = objectMapper.readTree(response.body());
            String accessToken = text(node, "access_token");
            if (!StringUtils.hasText(accessToken)) {
                throw new BadRequestException("OAuth token exchange did not return an access token");
            }

            long expiresIn = node.path("expires_in").asLong(3600);
            return new OAuthTokenResponse(
                    accessToken,
                    text(node, "refresh_token"),
                    text(node, "token_type"),
                    LocalDateTime.now().plusSeconds(expiresIn)
            );
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("OAuth token exchange failed");
        }
    }

    private OAuthTokenResponse refreshStoredToken(IntegrationTemplate template, WorkspaceIntegration integration) {
        try {
            String form = "grant_type=refresh_token"
                    + "&refresh_token=" + urlEncode(tenantCredentialCipher.decrypt(integration.getRefreshToken()))
                    + "&client_id=" + urlEncode(integration.getClientId())
                    + "&client_secret=" + urlEncode(tenantCredentialCipher.decrypt(integration.getClientSecret()));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(template.tokenEndpoint()))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("OAuth token refresh failed: " + response.body());
            }

            JsonNode node = objectMapper.readTree(response.body());
            String accessToken = text(node, "access_token");
            if (!StringUtils.hasText(accessToken)) {
                throw new BadRequestException("OAuth token refresh did not return an access token");
            }

            long expiresIn = node.path("expires_in").asLong(3600);
            return new OAuthTokenResponse(
                    accessToken,
                    text(node, "refresh_token"),
                    text(node, "token_type"),
                    LocalDateTime.now().plusSeconds(expiresIn)
            );
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("OAuth token refresh failed");
        }
    }

    private String text(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText(null);
        return StringUtils.hasText(value) ? value : null;
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("No tenant context available");
        }
        return tenantId;
    }

    private Map<String, IntegrationTemplate> integrationTemplates() {
        Map<String, IntegrationTemplate> templates = new LinkedHashMap<>();
        templates.put("smtp-email", buildSmtpTemplate());
        templates.put("crm-calendar", new IntegrationTemplate(
                "crm-calendar", "CRM Calendar", "CALENDAR", "NATIVE", "ACTIVE",
                "Internal meetings, demos, calls, and follow-up events",
                "Calendar records are fully available inside the CRM, but external sync is not connected yet.",
                false, "NATIVE", null, null, null, null, null
        ));
        templates.put("google-workspace", new IntegrationTemplate(
                "google-workspace", "Google Workspace", "EMAIL_CALENDAR", "THIRD_PARTY", "PREVIEW",
                "Gmail and Google Calendar sync",
                "Save OAuth configuration here to prepare Gmail and Google Calendar integration.",
                true, "OAUTH2", "https://www.googleapis.com", "http://localhost:5173/settings/integrations/google/callback",
                "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar",
                "https://accounts.google.com/o/oauth2/v2/auth",
                "https://oauth2.googleapis.com/token"
        ));
        templates.put("microsoft-365", new IntegrationTemplate(
                "microsoft-365", "Microsoft 365", "EMAIL_CALENDAR", "THIRD_PARTY", "PREVIEW",
                "Outlook email and calendar sync",
                "Save Microsoft Graph or Exchange configuration here to prepare Outlook integration.",
                true, "OAUTH2", "https://graph.microsoft.com", "http://localhost:5173/settings/integrations/microsoft/callback",
                "offline_access Mail.Read Mail.Send Calendars.ReadWrite",
                "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        ));
        templates.put("slack", new IntegrationTemplate(
                "slack", "Slack", "COLLABORATION", "THIRD_PARTY", "PREVIEW",
                "Alerts, notifications, and workflow handoff",
                "Save Slack app credentials here to prepare alert delivery.",
                true, "OAUTH2", "https://slack.com/api", "http://localhost:5173/settings/integrations/slack/callback",
                "chat:write incoming-webhook channels:read",
                "https://slack.com/oauth/v2/authorize",
                "https://slack.com/api/oauth.v2.access"
        ));
        templates.put("salesforce", new IntegrationTemplate(
                "salesforce", "Salesforce", "CRM", "THIRD_PARTY", "PREVIEW",
                "CRM import and sync",
                "Save Salesforce connected-app credentials here to prepare CRM sync.",
                true, "OAUTH2", "https://login.salesforce.com", "http://localhost:5173/settings/integrations/salesforce/callback",
                "api refresh_token",
                "https://login.salesforce.com/services/oauth2/authorize",
                "https://login.salesforce.com/services/oauth2/token"
        ));
        templates.put("hubspot", new IntegrationTemplate(
                "hubspot", "HubSpot", "MARKETING", "THIRD_PARTY", "PREVIEW",
                "Marketing automation and lead sync",
                "Save HubSpot app credentials here to prepare marketing sync.",
                true, "OAUTH2", "https://api.hubapi.com", "http://localhost:5173/settings/integrations/hubspot/callback",
                "crm.objects.contacts.read oauth",
                "https://app.hubspot.com/oauth/authorize",
                "https://api.hubapi.com/oauth/v1/token"
        ));
        templates.put("quickbooks", new IntegrationTemplate(
                "quickbooks", "QuickBooks", "ERP_FINANCE", "THIRD_PARTY", "PREVIEW",
                "Finance and invoice synchronization",
                "Save QuickBooks credentials here to prepare invoice and accounting sync.",
                true, "OAUTH2", "https://quickbooks.api.intuit.com", "http://localhost:5173/settings/integrations/quickbooks/callback",
                "com.intuit.quickbooks.accounting",
                "https://appcenter.intuit.com/connect/oauth2",
                "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
        ));
        templates.put("xero", new IntegrationTemplate(
                "xero", "Xero", "ERP_FINANCE", "THIRD_PARTY", "PREVIEW",
                "Accounting and finance synchronization",
                "Save Xero credentials here to prepare accounting sync.",
                true, "OAUTH2", "https://api.xero.com", "http://localhost:5173/settings/integrations/xero/callback",
                "offline_access accounting.transactions accounting.contacts",
                "https://login.xero.com/identity/connect/authorize",
                "https://identity.xero.com/connect/token"
        ));
        return templates;
    }

    private IntegrationTemplate buildSmtpTemplate() {
        String host = environment.getProperty("spring.mail.host", "");
        String port = environment.getProperty("spring.mail.port", "");
        String username = environment.getProperty("spring.mail.username", "");
        boolean smtpConfigured = StringUtils.hasText(host)
                && !"smtp.example.com".equalsIgnoreCase(host.trim())
                && (StringUtils.hasText(username)
                || "false".equalsIgnoreCase(environment.getProperty("spring.mail.properties.mail.smtp.auth", "true")));

        String detail = smtpConfigured
                ? String.format("Email is configured to send through %s%s%s.",
                host,
                StringUtils.hasText(port) ? ":" : "",
                StringUtils.hasText(port) ? port : "")
                : "SMTP delivery is available in the platform, but host and credentials still need to be configured.";

        return new IntegrationTemplate(
                "smtp-email", "SMTP Email Delivery", "EMAIL", "NATIVE", smtpConfigured ? "CONFIGURED" : "SETUP_REQUIRED",
                "Outbound email delivery from the CRM",
                detail,
                false, "BASIC", null, null, null, null, null
        );
    }

    private record IntegrationTemplate(
            String key,
            String name,
            String category,
            String providerType,
            String defaultStatus,
            String description,
            String detail,
            boolean editable,
            String defaultAuthType,
            String defaultBaseUrl,
            String defaultRedirectUri,
            String defaultScopes,
            String authorizationEndpoint,
            String tokenEndpoint
    ) {
    }

    private record OAuthTokenResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            LocalDateTime expiresAt
    ) {
    }
}
