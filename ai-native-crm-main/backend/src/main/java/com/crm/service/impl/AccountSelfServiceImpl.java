package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.AccountProfileUpdateRequestDTO;
import com.crm.dto.request.NotificationPreferenceUpdateRequestDTO;
import com.crm.dto.request.PasswordChangeRequestDTO;
import com.crm.dto.request.TwoFactorDisableRequestDTO;
import com.crm.dto.request.TwoFactorVerificationRequestDTO;
import com.crm.dto.response.AccountProfileResponseDTO;
import com.crm.dto.response.BillingPortalResponseDTO;
import com.crm.dto.response.NotificationPreferenceResponseDTO;
import com.crm.dto.response.TwoFactorSetupResponseDTO;
import com.crm.dto.response.TwoFactorStatusResponseDTO;
import com.crm.dto.response.UserSessionResponseDTO;
import com.crm.entity.Tenant;
import com.crm.entity.User;
import com.crm.entity.UserNotificationPreference;
import com.crm.entity.UserSession;
import com.crm.exception.BadRequestException;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.exception.UnauthorizedException;
import com.crm.repository.TenantRepository;
import com.crm.repository.UserNotificationPreferenceRepository;
import com.crm.repository.UserRepository;
import com.crm.repository.UserSessionRepository;
import com.crm.security.JwtTokenProvider;
import com.crm.security.TwoFactorTotpService;
import com.crm.service.AccountSelfService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountSelfServiceImpl implements AccountSelfService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserNotificationPreferenceRepository notificationPreferenceRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TwoFactorTotpService twoFactorTotpService;

    @Value("${billing.portal-base-url:}")
    private String billingPortalBaseUrl;

    @Override
    @Transactional(readOnly = true)
    public AccountProfileResponseDTO getProfile() {
        User user = requireCurrentUser();
        Tenant tenant = requireCurrentTenant(user.getTenantId());
        return mapProfile(user, tenant);
    }

    @Override
    @Transactional
    public AccountProfileResponseDTO updateProfile(AccountProfileUpdateRequestDTO request) {
        User user = requireCurrentUser();
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        userRepository.findByTenantIdAndEmailAndArchivedFalse(user.getTenantId(), normalizedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("User", "email", normalizedEmail);
                });

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setEmail(normalizedEmail);
        user.setAvatar(StringUtils.hasText(request.getAvatar()) ? request.getAvatar().trim() : null);
        userRepository.save(user);

        Tenant tenant = requireCurrentTenant(user.getTenantId());
        return mapProfile(user, tenant);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferenceResponseDTO getNotificationPreferences() {
        User user = requireCurrentUser();
        return mapNotificationPreferences(resolvePreferences(user));
    }

    @Override
    @Transactional
    public NotificationPreferenceResponseDTO updateNotificationPreferences(NotificationPreferenceUpdateRequestDTO request) {
        User user = requireCurrentUser();
        UserNotificationPreference preferences = resolvePreferences(user);

        if (request.getEmailNotificationsEnabled() != null) {
            preferences.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
        }
        if (request.getPushNotificationsEnabled() != null) {
            preferences.setPushNotificationsEnabled(request.getPushNotificationsEnabled());
        }
        if (request.getLeadAssignmentEnabled() != null) {
            preferences.setLeadAssignmentEnabled(request.getLeadAssignmentEnabled());
        }
        if (request.getDealStageChangesEnabled() != null) {
            preferences.setDealStageChangesEnabled(request.getDealStageChangesEnabled());
        }
        if (request.getTaskRemindersEnabled() != null) {
            preferences.setTaskRemindersEnabled(request.getTaskRemindersEnabled());
        }
        if (request.getTeamMentionsEnabled() != null) {
            preferences.setTeamMentionsEnabled(request.getTeamMentionsEnabled());
        }
        if (request.getWeeklyReportsEnabled() != null) {
            preferences.setWeeklyReportsEnabled(request.getWeeklyReportsEnabled());
        }

        notificationPreferenceRepository.save(preferences);
        return mapNotificationPreferences(preferences);
    }

    @Override
    @Transactional
    public void changePassword(PasswordChangeRequestDTO request) {
        User user = requireCurrentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        UUID currentSessionId = currentSessionId();
        userSessionRepository.findByTenantIdAndUserIdAndArchivedFalseOrderByLastUsedAtDesc(user.getTenantId(), user.getId())
                .forEach(session -> {
                    if (currentSessionId != null && session.getId().equals(currentSessionId)) {
                        return;
                    }
                    if (!Boolean.TRUE.equals(request.getRevokeOtherSessions())) {
                        return;
                    }
                    revokeSessionInternal(session, "PASSWORD_CHANGED");
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSessionResponseDTO> getSessions() {
        User user = requireCurrentUser();
        UUID currentSessionId = currentSessionId();
        return userSessionRepository.findByTenantIdAndUserIdAndArchivedFalseOrderByLastUsedAtDesc(user.getTenantId(), user.getId())
                .stream()
                .map(session -> mapSession(session, currentSessionId))
                .toList();
    }

    @Override
    @Transactional
    public void revokeSession(UUID sessionId) {
        User user = requireCurrentUser();
        UserSession session = userSessionRepository.findByTenantIdAndUserIdAndIdAndArchivedFalse(user.getTenantId(), user.getId(), sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserSession", sessionId));
        revokeSessionInternal(session, "USER_REVOKED");
    }

    @Override
    @Transactional
    public void revokeOtherSessions() {
        User user = requireCurrentUser();
        UUID currentSessionId = currentSessionId();
        userSessionRepository.findByTenantIdAndUserIdAndArchivedFalseOrderByLastUsedAtDesc(user.getTenantId(), user.getId())
                .forEach(session -> {
                    if (currentSessionId != null && session.getId().equals(currentSessionId)) {
                        return;
                    }
                    revokeSessionInternal(session, "USER_REVOKED_OTHER_SESSIONS");
                });
    }

    @Override
    @Transactional(readOnly = true)
    public BillingPortalResponseDTO getBillingPortal() {
        User user = requireCurrentUser();
        Tenant tenant = requireCurrentTenant(user.getTenantId());
        boolean enabled = StringUtils.hasText(billingPortalBaseUrl);
        String portalUrl = enabled
                ? billingPortalBaseUrl.replaceAll("/+$", "") + "?tenant=" + tenant.getSlug()
                : null;

        return BillingPortalResponseDTO.builder()
                .tenantName(tenant.getName())
                .tenantSlug(tenant.getSlug())
                .tenantTier(tenant.getTier().name())
                .portalEnabled(enabled)
                .portalUrl(portalUrl)
                .detail(enabled
                        ? "Workspace billing actions are available through the configured billing portal."
                        : "Billing portal is not configured for this environment.")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TwoFactorStatusResponseDTO getTwoFactorStatus() {
        User user = requireCurrentUser();
        return mapTwoFactorStatus(user);
    }

    @Override
    @Transactional
    public TwoFactorSetupResponseDTO beginTwoFactorSetup() {
        User user = requireCurrentUser();
        String secret = twoFactorTotpService.generateSecret();
        user.setTwoFactorSecret(secret);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorEnabledAt(null);
        userRepository.save(user);

        return TwoFactorSetupResponseDTO.builder()
                .enabled(false)
                .pendingVerification(true)
                .issuer(twoFactorTotpService.getIssuer())
                .manualEntryKey(secret)
                .otpauthUri(twoFactorTotpService.buildOtpAuthUri(user.getEmail(), secret))
                .build();
    }

    @Override
    @Transactional
    public TwoFactorStatusResponseDTO enableTwoFactor(TwoFactorVerificationRequestDTO request) {
        User user = requireCurrentUser();
        if (!StringUtils.hasText(user.getTwoFactorSecret())) {
            throw new BadRequestException("Two-factor setup has not been started");
        }
        if (!twoFactorTotpService.verifyCode(user.getTwoFactorSecret(), request.getCode())) {
            throw new BadRequestException("Invalid authentication code");
        }

        user.setTwoFactorEnabled(true);
        user.setTwoFactorEnabledAt(LocalDateTime.now());
        userRepository.save(user);
        return mapTwoFactorStatus(user);
    }

    @Override
    @Transactional
    public TwoFactorStatusResponseDTO disableTwoFactor(TwoFactorDisableRequestDTO request) {
        User user = requireCurrentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setTwoFactorEnabledAt(null);
        userRepository.save(user);
        return mapTwoFactorStatus(user);
    }

    private AccountProfileResponseDTO mapProfile(User user, Tenant tenant) {
        return AccountProfileResponseDTO.builder()
                .userId(user.getId())
                .tenantId(user.getTenantId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .role(user.getRole().name())
                .tenantName(tenant.getName())
                .tenantSlug(tenant.getSlug())
                .tenantTier(tenant.getTier().name())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    private NotificationPreferenceResponseDTO mapNotificationPreferences(UserNotificationPreference preferences) {
        return NotificationPreferenceResponseDTO.builder()
                .emailNotificationsEnabled(preferences.getEmailNotificationsEnabled())
                .pushNotificationsEnabled(preferences.getPushNotificationsEnabled())
                .leadAssignmentEnabled(preferences.getLeadAssignmentEnabled())
                .dealStageChangesEnabled(preferences.getDealStageChangesEnabled())
                .taskRemindersEnabled(preferences.getTaskRemindersEnabled())
                .teamMentionsEnabled(preferences.getTeamMentionsEnabled())
                .weeklyReportsEnabled(preferences.getWeeklyReportsEnabled())
                .build();
    }

    private UserSessionResponseDTO mapSession(UserSession session, UUID currentSessionId) {
        boolean active = session.getRevokedAt() == null && session.getExpiresAt().isAfter(LocalDateTime.now());
        return UserSessionResponseDTO.builder()
                .sessionId(session.getId())
                .currentSession(currentSessionId != null && currentSessionId.equals(session.getId()))
                .active(active)
                .userAgent(session.getUserAgent())
                .ipAddress(session.getIpAddress())
                .createdAt(session.getCreatedAt())
                .lastUsedAt(session.getLastUsedAt())
                .expiresAt(session.getExpiresAt())
                .revokedAt(session.getRevokedAt())
                .revocationReason(session.getRevocationReason())
                .build();
    }

    private UserNotificationPreference resolvePreferences(User user) {
        return notificationPreferenceRepository.findByTenantIdAndUserIdAndArchivedFalse(user.getTenantId(), user.getId())
                .orElseGet(() -> {
                    UserNotificationPreference preferences = UserNotificationPreference.builder()
                            .userId(user.getId())
                            .build();
                    preferences.setTenantId(user.getTenantId());
                    return notificationPreferenceRepository.save(preferences);
                });
    }

    private Tenant requireCurrentTenant(UUID tenantId) {
        return tenantRepository.findByIdAndArchivedFalse(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
    }

    private User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Authentication required");
        }
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId != null && !tenantId.equals(user.getTenantId())) {
            throw new UnauthorizedException("Invalid tenant context");
        }
        return userRepository.findByIdAndTenantIdAndArchivedFalse(user.getId(), user.getTenantId())
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));
    }

    private UUID currentSessionId() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        String authHeader = request.getHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return jwtTokenProvider.extractSessionId(authHeader.substring(7));
    }

    private HttpServletRequest currentRequest() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return null;
        }
        return attributes.getRequest();
    }

    private void revokeSessionInternal(UserSession session, String reason) {
        if (session.getRevokedAt() != null) {
            return;
        }
        session.setRevokedAt(LocalDateTime.now());
        session.setRevocationReason(reason);
        userSessionRepository.save(session);
    }

    private TwoFactorStatusResponseDTO mapTwoFactorStatus(User user) {
        return TwoFactorStatusResponseDTO.builder()
                .enabled(Boolean.TRUE.equals(user.getTwoFactorEnabled()))
                .pendingVerification(!Boolean.TRUE.equals(user.getTwoFactorEnabled()) && StringUtils.hasText(user.getTwoFactorSecret()))
                .issuer(twoFactorTotpService.getIssuer())
                .enabledAt(user.getTwoFactorEnabledAt())
                .build();
    }
}
