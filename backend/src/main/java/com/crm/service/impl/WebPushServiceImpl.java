package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.WebPushSubscriptionRequestDTO;
import com.crm.dto.response.WebPushConfigResponseDTO;
import com.crm.dto.response.WebPushPendingNotificationResponseDTO;
import com.crm.dto.response.WebPushSubscriptionResponseDTO;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.UserNotificationPreference;
import com.crm.entity.UserPushNotification;
import com.crm.entity.UserPushSubscription;
import com.crm.exception.BadRequestException;
import com.crm.exception.UnauthorizedException;
import com.crm.repository.UserNotificationPreferenceRepository;
import com.crm.repository.UserPushNotificationRepository;
import com.crm.repository.UserPushSubscriptionRepository;
import com.crm.repository.UserRepository;
import com.crm.service.WebPushService;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class WebPushServiceImpl implements WebPushService {

    private static final String SERVICE_WORKER_PATH = "/crm-push-sw.js";
    private static final String CATEGORY_TASK_ASSIGNED = "TASK_ASSIGNED";

    private final UserPushSubscriptionRepository userPushSubscriptionRepository;
    private final UserPushNotificationRepository userPushNotificationRepository;
    private final UserNotificationPreferenceRepository notificationPreferenceRepository;
    private final UserRepository userRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final boolean webPushEnabled;
    private final String publicKey;
    private final String subject;
    private final PrivateKey privateKey;

    public WebPushServiceImpl(
            UserPushSubscriptionRepository userPushSubscriptionRepository,
            UserPushNotificationRepository userPushNotificationRepository,
            UserNotificationPreferenceRepository notificationPreferenceRepository,
            UserRepository userRepository,
            @Value("${web-push.enabled:true}") boolean webPushEnabled,
            @Value("${web-push.public-key:}") String publicKey,
            @Value("${web-push.private-key:}") String privateKey,
            @Value("${web-push.subject:mailto:notifications@cicosy.local}") String subject
    ) {
        this.userPushSubscriptionRepository = userPushSubscriptionRepository;
        this.userPushNotificationRepository = userPushNotificationRepository;
        this.notificationPreferenceRepository = notificationPreferenceRepository;
        this.userRepository = userRepository;
        this.webPushEnabled = webPushEnabled;
        this.publicKey = normalize(publicKey);
        this.subject = normalize(subject);
        this.privateKey = StringUtils.hasText(this.publicKey) && StringUtils.hasText(privateKey) && StringUtils.hasText(this.subject)
                ? buildPrivateKey(privateKey)
                : null;
    }

    @Override
    @Transactional(readOnly = true)
    public WebPushConfigResponseDTO getCurrentUserPushConfig() {
        requireCurrentUser();
        return WebPushConfigResponseDTO.builder()
                .enabled(isWebPushConfigured())
                .publicKey(isWebPushConfigured() ? publicKey : null)
                .serviceWorkerPath(SERVICE_WORKER_PATH)
                .build();
    }

    @Override
    @Transactional
    public WebPushSubscriptionResponseDTO registerCurrentUserSubscription(WebPushSubscriptionRequestDTO request) {
        User user = requireCurrentUser();
        UserPushSubscription subscription = userPushSubscriptionRepository
                .findByTenantIdAndUserIdAndEndpointAndArchivedFalse(user.getTenantId(), user.getId(), request.getEndpoint().trim())
                .orElseGet(() -> {
                    UserPushSubscription created = UserPushSubscription.builder()
                            .userId(user.getId())
                            .deviceToken(UUID.randomUUID().toString())
                            .endpoint(request.getEndpoint().trim())
                            .build();
                    created.setTenantId(user.getTenantId());
                    return created;
                });

        subscription.setEndpoint(request.getEndpoint().trim());
        subscription.setExpirationTime(toDateTime(request.getExpirationTimeEpochMs()));
        subscription.setP256dhKey(normalize(request.getP256dhKey()));
        subscription.setAuthKey(normalize(request.getAuthKey()));
        subscription.setUserAgent(normalize(request.getUserAgent()));
        subscription.setLastSeenAt(LocalDateTime.now());
        subscription.setArchived(false);

        UserPushSubscription saved = userPushSubscriptionRepository.save(subscription);
        return mapSubscription(saved);
    }

    @Override
    @Transactional
    public void removeCurrentUserSubscription(String endpoint) {
        if (!StringUtils.hasText(endpoint)) {
            throw new BadRequestException("Push subscription endpoint is required");
        }

        User user = requireCurrentUser();
        UserPushSubscription subscription = userPushSubscriptionRepository
                .findByTenantIdAndUserIdAndEndpointAndArchivedFalse(user.getTenantId(), user.getId(), endpoint.trim())
                .orElseThrow(() -> new BadRequestException("No active push subscription exists for this endpoint"));

        subscription.setArchived(true);
        subscription.setLastSeenAt(LocalDateTime.now());
        userPushSubscriptionRepository.save(subscription);
    }

    @Override
    @Transactional
    public List<WebPushPendingNotificationResponseDTO> fetchPendingNotifications(String deviceToken) {
        if (!StringUtils.hasText(deviceToken)) {
            return List.of();
        }

        UserPushSubscription subscription = userPushSubscriptionRepository.findByDeviceTokenAndArchivedFalse(deviceToken.trim())
                .orElse(null);
        if (subscription == null) {
            return List.of();
        }

        LocalDateTime now = LocalDateTime.now();
        List<UserPushNotification> notifications = userPushNotificationRepository.findPendingNotifications(
                subscription.getTenantId(),
                subscription.getDeviceToken(),
                now
        );

        if (!notifications.isEmpty()) {
            notifications.forEach(notification -> notification.setFetchedAt(now));
            userPushNotificationRepository.saveAll(notifications);
        }

        subscription.setLastSeenAt(now);
        userPushSubscriptionRepository.save(subscription);

        return notifications.stream()
                .map(notification -> WebPushPendingNotificationResponseDTO.builder()
                        .id(notification.getId())
                        .category(notification.getCategory())
                        .title(notification.getTitle())
                        .body(notification.getBody())
                        .targetUrl(notification.getTargetUrl())
                        .createdAt(notification.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void notifyTaskAssigned(UUID tenantId, UUID userId, Task task) {
        if (tenantId == null || userId == null || task == null) {
            return;
        }

        UserNotificationPreference preferences = notificationPreferenceRepository
                .findByTenantIdAndUserIdAndArchivedFalse(tenantId, userId)
                .orElseGet(() -> {
                    UserNotificationPreference created = UserNotificationPreference.builder()
                            .userId(userId)
                            .build();
                    created.setTenantId(tenantId);
                    return created;
                });

        if (!Boolean.TRUE.equals(preferences.getPushNotificationsEnabled())
                || !Boolean.TRUE.equals(preferences.getTaskRemindersEnabled())) {
            return;
        }

        List<UserPushSubscription> subscriptions = userPushSubscriptionRepository.findByTenantIdAndUserIdAndArchivedFalse(tenantId, userId);
        if (subscriptions.isEmpty()) {
            return;
        }

        List<UserPushNotification> queuedNotifications = new ArrayList<>();
        for (UserPushSubscription subscription : subscriptions) {
            UserPushNotification notification = UserPushNotification.builder()
                    .userId(userId)
                    .deviceToken(subscription.getDeviceToken())
                    .category(CATEGORY_TASK_ASSIGNED)
                    .title("New task assigned")
                    .body(buildTaskBody(task))
                    .targetUrl(task.getId() != null ? "/tasks?taskId=" + task.getId() : "/tasks")
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            notification.setTenantId(tenantId);
            queuedNotifications.add(notification);
        }

        userPushNotificationRepository.saveAll(queuedNotifications);
        subscriptions.forEach(this::triggerSilentPush);
    }

    private String buildTaskBody(Task task) {
        StringBuilder body = new StringBuilder(task.getTitle());
        if (task.getDueDate() != null) {
            body.append(" • Due ").append(task.getDueDate());
        }
        return body.toString();
    }

    private void triggerSilentPush(UserPushSubscription subscription) {
        subscription.setLastPushAttemptAt(LocalDateTime.now());

        if (!isWebPushConfigured()) {
            subscription.setLastPushSucceeded(false);
            subscription.setLastPushStatus("Web push is not configured on this environment");
            userPushSubscriptionRepository.save(subscription);
            return;
        }

        try {
            URI endpoint = URI.create(subscription.getEndpoint());
            String audience = endpoint.getScheme() + "://" + endpoint.getAuthority();
            String jwt = Jwts.builder()
                    .claim("aud", audience)
                    .subject(subject)
                    .issuedAt(new Date())
                    .expiration(Date.from(Instant.now().plusSeconds(60 * 60 * 12)))
                    .signWith(privateKey, Jwts.SIG.ES256)
                    .compact();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(endpoint)
                    .header("TTL", "60")
                    .header("Urgency", "normal")
                    .header("Authorization", "vapid t=" + jwt + ", k=" + publicKey)
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            subscription.setLastPushSucceeded(response.statusCode() >= 200 && response.statusCode() < 300);
            subscription.setLastPushStatus("HTTP " + response.statusCode());
            if (response.statusCode() == 404 || response.statusCode() == 410) {
                subscription.setArchived(true);
            }
        } catch (Exception ex) {
            log.warn("Failed to send web push notification for subscription {}", subscription.getId(), ex);
            subscription.setLastPushSucceeded(false);
            subscription.setLastPushStatus(ex.getClass().getSimpleName() + ": " + ex.getMessage());
        }

        userPushSubscriptionRepository.save(subscription);
    }

    private WebPushSubscriptionResponseDTO mapSubscription(UserPushSubscription subscription) {
        return WebPushSubscriptionResponseDTO.builder()
                .deviceToken(subscription.getDeviceToken())
                .endpoint(subscription.getEndpoint())
                .registeredAt(subscription.getCreatedAt())
                .lastSeenAt(subscription.getLastSeenAt())
                .lastPushSucceeded(subscription.getLastPushSucceeded())
                .lastPushStatus(subscription.getLastPushStatus())
                .build();
    }

    private User requireCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof User user)) {
            throw new UnauthorizedException("Authentication required");
        }
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId != null && !tenantId.equals(user.getTenantId())) {
            throw new UnauthorizedException("Invalid tenant context");
        }
        return userRepository.findByIdAndTenantIdAndArchivedFalse(user.getId(), user.getTenantId())
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));
    }

    private boolean isWebPushConfigured() {
        return webPushEnabled && StringUtils.hasText(publicKey) && StringUtils.hasText(subject) && privateKey != null;
    }

    private PrivateKey buildPrivateKey(String encodedPrivateKey) {
        try {
            byte[] rawPrivateKey = Base64.getUrlDecoder().decode(normalize(encodedPrivateKey));
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec("secp256r1"));
            ECParameterSpec parameterSpec = parameters.getParameterSpec(ECParameterSpec.class);
            ECPrivateKeySpec keySpec = new ECPrivateKeySpec(new BigInteger(1, rawPrivateKey), parameterSpec);
            return KeyFactory.getInstance("EC").generatePrivate(keySpec);
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid WEB_PUSH_PRIVATE_KEY configuration", ex);
        }
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private LocalDateTime toDateTime(Long epochMillis) {
        if (epochMillis == null) {
            return null;
        }
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
    }
}
