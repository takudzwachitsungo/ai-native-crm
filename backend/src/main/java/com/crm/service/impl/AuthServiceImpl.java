package com.crm.service.impl;

import com.crm.dto.request.LoginRequest;
import com.crm.dto.request.RefreshTokenRequest;
import com.crm.dto.request.RegisterRequest;
import com.crm.dto.response.AuthResponse;
import com.crm.entity.Tenant;
import com.crm.entity.User;
import com.crm.entity.UserSession;
import com.crm.entity.enums.TenantTier;
import com.crm.entity.enums.UserRole;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.UnauthorizedException;
import com.crm.config.TenantContext;
import com.crm.repository.TenantRepository;
import com.crm.repository.UserSessionRepository;
import com.crm.repository.UserRepository;
import com.crm.security.JwtTokenProvider;
import com.crm.security.RolePermissionRegistry;
import com.crm.security.TwoFactorTotpService;
import com.crm.service.AuthService;
import com.crm.service.TenantProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TwoFactorTotpService twoFactorTotpService;
    private final TenantProvisioningService tenantProvisioningService;
    private final TransactionTemplate transactionTemplate;
    
    @Value("${security.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${security.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.ADMIN);
        user.setIsActive(true);
        user = userRepository.save(user);

        tenantProvisioningService.provisionTenantDatabase(tenant, user);
        tenant = tenantRepository.save(tenant);
        
        log.info("Created new admin user: {} for tenant: {}", user.getEmail(), tenant.getName());

        UserSession session = createSession(user, tenant);
        String accessToken = jwtTokenProvider.generateAccessToken(user, tenant.getId(), user.getId(), session.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user, user.getId(), tenant.getId(), session.getId());

        return buildAuthResponse(user, tenant, accessToken, refreshToken);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Tenant tenant = resolveTenantForLogin(request);
        TenantContext.setTenantId(tenant.getId());
        try {
            return transactionTemplate.execute(status -> {
                User user = userRepository.findByTenantIdAndEmailAndArchivedFalse(tenant.getId(), request.getEmail())
                        .orElseThrow(() -> new UnauthorizedException("Invalid workspace, email, or password"));

                if (!user.getIsActive() || user.getArchived()) {
                    throw new UnauthorizedException("User account is inactive");
                }

                if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                    throw new UnauthorizedException("Invalid workspace, email, or password");
                }

                if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
                    if (request.getOtpCode() == null || request.getOtpCode().isBlank()) {
                        throw new UnauthorizedException("Two-factor authentication code is required");
                    }
                    if (!twoFactorTotpService.verifyCode(user.getTwoFactorSecret(), request.getOtpCode())) {
                        throw new UnauthorizedException("Invalid two-factor authentication code");
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
        } finally {
            TenantContext.clear();
        }
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
        if (request.getWorkspaceSlug() != null && !request.getWorkspaceSlug().isBlank()) {
            return tenantRepository.findBySlugAndArchivedFalse(normalizeWorkspaceSlug(request.getWorkspaceSlug()))
                    .orElseThrow(() -> new UnauthorizedException("Workspace not found"));
        }

        List<User> matchingUsers = userRepository.findAllByEmailAndArchivedFalse(request.getEmail());
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
