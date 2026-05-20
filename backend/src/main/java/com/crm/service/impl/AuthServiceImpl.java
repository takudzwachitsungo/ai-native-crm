package com.crm.service.impl;

import com.crm.dto.request.LoginRequest;
import com.crm.dto.request.PasswordResetConfirmRequestDTO;
import com.crm.dto.request.PasswordResetRequestDTO;
import com.crm.dto.request.RefreshTokenRequest;
import com.crm.dto.request.RegisterRequest;
import com.crm.dto.response.AuthResponse;
import com.crm.entity.PasswordResetToken;
import com.crm.entity.Tenant;
import com.crm.entity.User;
import com.crm.entity.UserSession;
import com.crm.entity.enums.TenantTier;
import com.crm.entity.enums.UserRole;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.UnauthorizedException;
import com.crm.config.TenantContext;
import com.crm.repository.TenantRepository;
import com.crm.repository.PasswordResetTokenRepository;
import com.crm.repository.UserSessionRepository;
import com.crm.repository.UserRepository;
import com.crm.security.JwtTokenProvider;
import com.crm.security.LoginAttemptService;
import com.crm.security.PasswordPolicyService;
import com.crm.security.RolePermissionRegistry;
import com.crm.security.TwoFactorTotpService;
import com.crm.service.AuthService;
import com.crm.service.TenantProvisioningService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final LoginAttemptService loginAttemptService;
    private final TwoFactorTotpService twoFactorTotpService;
    private final PasswordPolicyService passwordPolicyService;
    private final TenantProvisioningService tenantProvisioningService;
    private final TransactionTemplate transactionTemplate;
    private final JavaMailSender mailSender;
    
    @Value("${security.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${security.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${security.password-reset.expiration-minutes:30}")
    private long passwordResetExpirationMinutes;

    @Value("${security.password-reset.frontend-base-url:http://localhost:5173}")
    private String passwordResetFrontendBaseUrl;

    @Value("${security.password-reset.from-address:${MAIL_USERNAME:no-reply@cicosy.local}}")
    private String passwordResetFromAddress;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        TenantContext.clear();
        String normalizedEmail = normalizeEmail(request.getEmail());
        passwordPolicyService.validate(request.getPassword());

        // Create tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.getCompanyName());
        tenant.setSlug(resolveUniqueWorkspaceSlug(request.getWorkspaceSlug(), request.getCompanyName()));
        tenant.setTier(request.getTier() != null ? request.getTier() : TenantTier.FREE);
        tenant.setRateLimitPerMinute(getRateLimitForTier(tenant.getTier()));
        tenant.setIsActive(true);
        tenant = tenantRepository.save(tenant);
        
        log.info("Created new tenant: {} with tier: {}", tenant.getName(), tenant.getTier());

        // Create admin user for tenant
        User user = new User();
        user.setTenantId(tenant.getId());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.ADMIN);
        user.setIsActive(true);
        TenantContext.clear();
        user = userRepository.save(user);

        tenantProvisioningService.provisionTenantDatabase(tenant, user);
        TenantContext.clear();
        tenant = tenantRepository.save(tenant);
        
        log.info("Created new admin user: {} for tenant: {}", user.getEmail(), tenant.getName());

        UserSession session = createInitialSession(user, tenant);
        String accessToken = jwtTokenProvider.generateAccessToken(user, tenant.getId(), user.getId(), session.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user, user.getId(), tenant.getId(), session.getId());

        return buildAuthResponse(user, tenant, accessToken, refreshToken);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        String ipAddress = resolveIpAddress();
        loginAttemptService.assertAllowed(normalizedEmail, ipAddress);
        try {
            Tenant tenant = resolveTenantForLogin(request);
            TenantContext.setTenantId(tenant.getId());
            AuthResponse response = transactionTemplate.execute(status -> {
                User user = userRepository.findByTenantIdAndEmailAndArchivedFalse(tenant.getId(), normalizedEmail)
                        .orElseThrow(() -> new UnauthorizedException("Invalid workspace, email, or password"));

                if (!user.getIsActive() || user.getArchived()) {
                    throw new UnauthorizedException("User account is inactive");
                }

                if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                    throw new UnauthorizedException("Invalid workspace, email, or password");
                }

                if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
                    if (request.getOtpCode() == null || request.getOtpCode().isBlank()) {
                        throw new UnauthorizedException("Two-factor authentication code is required", "TWO_FACTOR_REQUIRED");
                    }
                    if (!twoFactorTotpService.verifyCode(user.getTwoFactorSecret(), request.getOtpCode())) {
                        throw new UnauthorizedException("Invalid two-factor authentication code", "TWO_FACTOR_INVALID");
                    }
                }

                user.setLastLoginAt(LocalDateTime.now());
                userRepository.save(user);

                log.info("User logged in: {} from tenant: {}", user.getEmail(), user.getTenantId());

                UserSession session = createSession(user, tenant);
                String accessToken = jwtTokenProvider.generateAccessToken(user, user.getTenantId(), user.getId(), session.getId());
                String refreshToken = jwtTokenProvider.generateRefreshToken(user, user.getId(), tenant.getId(), session.getId());

                return buildAuthResponse(user, tenant, accessToken, refreshToken);
            });
            loginAttemptService.recordSuccess(normalizedEmail, ipAddress);
            return response;
        } catch (UnauthorizedException ex) {
            loginAttemptService.recordFailure(normalizedEmail, ipAddress);
            throw ex;
        } finally {
            TenantContext.clear();
        }
    }

    @Override
    @Transactional
    public void requestPasswordReset(PasswordResetRequestDTO request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        resolveUserForPasswordReset(normalizedEmail, request.getWorkspaceSlug())
                .filter(user -> Boolean.TRUE.equals(user.getIsActive()) && !Boolean.TRUE.equals(user.getArchived()))
                .ifPresent(user -> {
                    archiveOutstandingResetTokens(user.getTenantId(), user.getId(), null);
                    String rawToken = generateRawResetToken();
                    PasswordResetToken resetToken = PasswordResetToken.builder()
                            .userId(user.getId())
                            .tokenHash(hashResetToken(rawToken))
                            .expiresAt(LocalDateTime.now().plusMinutes(passwordResetExpirationMinutes))
                            .requestedIp(resolveIpAddress())
                            .requestedUserAgent(resolveUserAgent())
                            .build();
                    resetToken.setTenantId(user.getTenantId());
                    passwordResetTokenRepository.save(resetToken);
                    sendPasswordResetEmail(user, rawToken);
                });
    }

    @Override
    @Transactional
    public void resetPassword(PasswordResetConfirmRequestDTO request) {
        passwordPolicyService.validate(request.getNewPassword());
        String tokenHash = hashResetToken(request.getToken());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedAtIsNullAndArchivedFalse(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Password reset link is invalid or has expired", "PASSWORD_RESET_INVALID"));

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            resetToken.setArchived(true);
            passwordResetTokenRepository.save(resetToken);
            throw new UnauthorizedException("Password reset link is invalid or has expired", "PASSWORD_RESET_EXPIRED");
        }

        User user = userRepository.findByIdAndTenantIdAndArchivedFalse(resetToken.getUserId(), resetToken.getTenantId())
                .orElseThrow(() -> new UnauthorizedException("Password reset link is invalid or has expired", "PASSWORD_RESET_INVALID"));

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new com.crm.exception.BadRequestException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        LocalDateTime usedAt = LocalDateTime.now();
        resetToken.setUsedAt(usedAt);
        passwordResetTokenRepository.save(resetToken);
        archiveOutstandingResetTokens(user.getTenantId(), user.getId(), resetToken.getId());
        revokeAllSessions(user.getTenantId(), user.getId(), "PASSWORD_RESET");
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            String refreshToken = request.getRefreshToken();
            java.util.UUID userId = jwtTokenProvider.extractUserId(refreshToken);
            java.util.UUID tenantId = jwtTokenProvider.extractTenantId(refreshToken);
            java.util.UUID sessionId = jwtTokenProvider.extractSessionId(refreshToken);

            if (tenantId == null) {
                throw new UnauthorizedException("Refresh token missing tenant context");
            }

            TenantContext.setTenantId(tenantId);
            return transactionTemplate.execute(status -> {
                User user = userRepository.findByIdAndTenantIdAndArchivedFalse(userId, tenantId)
                        .orElseThrow(() -> new UnauthorizedException("User not found"));
                Tenant tenant = tenantRepository.findByIdAndArchivedFalse(tenantId)
                        .orElseThrow(() -> new UnauthorizedException("Tenant not found"));

                if (!jwtTokenProvider.isRefreshToken(refreshToken)) {
                    throw new UnauthorizedException("Invalid refresh token");
                }

                if (!jwtTokenProvider.isTokenValid(refreshToken, user)) {
                    throw new UnauthorizedException("Invalid refresh token");
                }

                UserSession session = resolveActiveSession(tenantId, userId, sessionId);
                touchSession(session);
                String accessToken = jwtTokenProvider.generateAccessToken(user, user.getTenantId(), user.getId(), session.getId());

                log.info("Token refreshed for user: {}", user.getEmail());

                return buildAuthResponse(user, tenant, accessToken, refreshToken);
            });
        } catch (Exception e) {
            log.error("Error refreshing token: {}", e.getMessage());
            throw new UnauthorizedException("Invalid refresh token");
        } finally {
            TenantContext.clear();
        }
    }

    private Integer getRateLimitForTier(TenantTier tier) {
        return switch (tier) {
            case FREE -> 100;
            case PRO -> 1000;
            case ENTERPRISE -> 10000;
        };
    }

    private AuthResponse buildAuthResponse(User user, Tenant tenant, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration)
                .userId(user.getId())
                .tenantId(tenant.getId())
                .tenantName(tenant.getName())
                .tenantSlug(tenant.getSlug())
                .tenantTier(tenant.getTier().name())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .permissions(RolePermissionRegistry.permissionsFor(user.getRole()).stream().map(Enum::name).toList())
                .dataScopes(RolePermissionRegistry.dataScopesFor(user.getRole()).stream().map(Enum::name).toList())
                .build();
    }

    private Tenant resolveTenantForLogin(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (request.getWorkspaceSlug() != null && !request.getWorkspaceSlug().isBlank()) {
            return tenantRepository.findBySlugAndArchivedFalse(normalizeWorkspaceSlug(request.getWorkspaceSlug()))
                    .orElseThrow(() -> new UnauthorizedException("Workspace not found"));
        }

        List<User> matchingUsers = userRepository.findAllByEmailAndArchivedFalse(normalizedEmail);
        if (matchingUsers.isEmpty()) {
            throw new UnauthorizedException("Invalid workspace, email, or password");
        }

        if (matchingUsers.size() > 1) {
            throw new UnauthorizedException("Multiple workspaces matched this email. Please provide your workspace slug.");
        }

        return tenantRepository.findByIdAndArchivedFalse(matchingUsers.get(0).getTenantId())
                .orElseThrow(() -> new UnauthorizedException("Tenant not found"));
    }

    private String resolveUniqueWorkspaceSlug(String requestedSlug, String companyName) {
        String baseSlug = normalizeWorkspaceSlug(
                requestedSlug != null && !requestedSlug.isBlank() ? requestedSlug : companyName
        );

        String candidate = baseSlug;
        int suffix = 2;
        while (tenantRepository.existsBySlugAndArchivedFalse(candidate)) {
            candidate = baseSlug + "-" + suffix;
            suffix++;
        }

        return candidate;
    }

    private String normalizeWorkspaceSlug(String value) {
        String normalized = value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+", "")
                .replaceAll("-+$", "")
                .replaceAll("-{2,}", "-");

        if (normalized.isBlank()) {
            throw new DuplicateResourceException("Tenant", "slug", value);
        }

        return normalized;
    }

    private String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private java.util.Optional<User> resolveUserForPasswordReset(String normalizedEmail, String workspaceSlug) {
        if (workspaceSlug != null && !workspaceSlug.isBlank()) {
            return tenantRepository.findBySlugAndArchivedFalse(normalizeWorkspaceSlug(workspaceSlug))
                    .flatMap(tenant -> userRepository.findByTenantIdAndEmailAndArchivedFalse(tenant.getId(), normalizedEmail));
        }

        List<User> matchingUsers = userRepository.findAllByEmailAndArchivedFalse(normalizedEmail);
        if (matchingUsers.size() != 1) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(matchingUsers.get(0));
    }

    private void archiveOutstandingResetTokens(UUID tenantId, UUID userId, UUID exceptTokenId) {
        passwordResetTokenRepository.findByTenantIdAndUserIdAndUsedAtIsNullAndArchivedFalse(tenantId, userId)
                .forEach(token -> {
                    if (Objects.equals(token.getId(), exceptTokenId)) {
                        return;
                    }
                    token.setArchived(true);
                    passwordResetTokenRepository.save(token);
                });
    }

    private void revokeAllSessions(UUID tenantId, UUID userId, String reason) {
        userSessionRepository.findByTenantIdAndUserIdAndArchivedFalseOrderByLastUsedAtDesc(tenantId, userId)
                .forEach(session -> {
                    if (session.getRevokedAt() != null) {
                        return;
                    }
                    session.setRevokedAt(LocalDateTime.now());
                    session.setRevocationReason(reason);
                    userSessionRepository.save(session);
                });
    }

    private String generateRawResetToken() {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashResetToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required for password reset hashing", ex);
        }
    }

    private void sendPasswordResetEmail(User user, String rawToken) {
        String resetLink = passwordResetFrontendBaseUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(passwordResetFromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Reset your Cicosy CRM password");
            helper.setText("""
                    Hello %s,

                    We received a request to reset the password for your %s workspace account.

                    Reset your password:
                    %s

                    This link expires in %d minutes. If you did not request this reset, you can ignore this message.
                    """.formatted(user.getFirstName(), resolveTenantName(user.getTenantId()), resetLink, passwordResetExpirationMinutes));
            mailSender.send(message);
        } catch (MailException | jakarta.mail.MessagingException ex) {
            log.error("Failed to deliver password reset email for user {}", user.getEmail(), ex);
        }
    }

    private String resolveTenantName(UUID tenantId) {
        return tenantRepository.findByIdAndArchivedFalse(tenantId)
                .map(Tenant::getName)
                .orElse("your");
    }

    private UserSession createSession(User user, Tenant tenant) {
        LocalDateTime now = LocalDateTime.now();
        UserSession session = UserSession.builder()
                .userId(user.getId())
                .userAgent(resolveUserAgent())
                .ipAddress(resolveIpAddress())
                .lastUsedAt(now)
                .expiresAt(now.plus(Duration.ofMillis(refreshTokenExpiration)))
                .build();
        session.setTenantId(tenant.getId());
        return userSessionRepository.save(session);
    }

    private UserSession createInitialSession(User user, Tenant tenant) {
        if (Boolean.TRUE.equals(tenant.getDedicatedDatabaseEnabled())
                && tenant.getDatabaseUrl() != null
                && tenant.getDatabaseUsername() != null
                && tenant.getDatabasePassword() != null) {
            return insertSessionIntoDedicatedDatabase(user, tenant);
        }

        TenantContext.setTenantId(tenant.getId());
        try {
            return createSession(user, tenant);
        } finally {
            TenantContext.clear();
        }
    }

    private UserSession insertSessionIntoDedicatedDatabase(User user, Tenant tenant) {
        LocalDateTime now = LocalDateTime.now();
        UserSession session = UserSession.builder()
                .userId(user.getId())
                .userAgent(resolveUserAgent())
                .ipAddress(resolveIpAddress())
                .lastUsedAt(now)
                .expiresAt(now.plus(Duration.ofMillis(refreshTokenExpiration)))
                .build();
        session.setId(UUID.randomUUID());
        session.setTenantId(tenant.getId());
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        session.setArchived(false);

        String sql = """
                INSERT INTO user_sessions (
                    id, tenant_id, user_id, user_agent, ip_address, last_used_at, expires_at,
                    revoked_at, revocation_reason, created_at, updated_at, created_by, updated_by, archived
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        try (
                Connection connection = DriverManager.getConnection(
                        tenant.getDatabaseUrl(),
                        tenant.getDatabaseUsername(),
                        tenant.getDatabasePassword()
                );
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setObject(1, session.getId());
            statement.setObject(2, session.getTenantId());
            statement.setObject(3, session.getUserId());
            statement.setString(4, session.getUserAgent());
            statement.setString(5, session.getIpAddress());
            statement.setTimestamp(6, Timestamp.valueOf(session.getLastUsedAt()));
            statement.setTimestamp(7, Timestamp.valueOf(session.getExpiresAt()));
            statement.setTimestamp(8, null);
            statement.setString(9, null);
            statement.setTimestamp(10, Timestamp.valueOf(session.getCreatedAt()));
            statement.setTimestamp(11, Timestamp.valueOf(session.getUpdatedAt()));
            statement.setObject(12, null);
            statement.setObject(13, null);
            statement.setBoolean(14, false);
            statement.executeUpdate();
            return session;
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to create initial session in dedicated tenant database", ex);
        }
    }

    private UserSession resolveActiveSession(UUID tenantId, UUID userId, UUID sessionId) {
        if (sessionId == null) {
            throw new UnauthorizedException("Refresh token missing session context");
        }
        UserSession session = userSessionRepository.findByTenantIdAndUserIdAndIdAndArchivedFalse(tenantId, userId, sessionId)
                .orElseThrow(() -> new UnauthorizedException("Session not found"));
        if (session.getRevokedAt() != null || session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Session is no longer active");
        }
        return session;
    }

    private void touchSession(UserSession session) {
        session.setLastUsedAt(LocalDateTime.now());
        session.setUserAgent(resolveUserAgent());
        session.setIpAddress(resolveIpAddress());
        userSessionRepository.save(session);
    }

    private String resolveUserAgent() {
        HttpServletRequest request = currentRequest();
        return request != null ? request.getHeader("User-Agent") : null;
    }

    private String resolveIpAddress() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private HttpServletRequest currentRequest() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return null;
        }
        return attributes.getRequest();
    }
}
