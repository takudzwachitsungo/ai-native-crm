package com.crm.service.impl;

import com.crm.dto.request.LoginRequest;
import com.crm.dto.request.RefreshTokenRequest;
import com.crm.dto.request.RegisterRequest;
import com.crm.dto.response.AuthResponse;
import com.crm.entity.Tenant;
import com.crm.entity.User;
import com.crm.entity.enums.TenantTier;
import com.crm.entity.enums.UserRole;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.UnauthorizedException;
import com.crm.repository.TenantRepository;
import com.crm.repository.UserRepository;
import com.crm.security.JwtTokenProvider;
import com.crm.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    
    @Value("${security.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if user already exists
        if (userRepository.existsByEmailAndArchivedFalse(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Create tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.getCompanyName());
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
        
        log.info("Created new admin user: {} for tenant: {}", user.getEmail(), tenant.getName());

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user, tenant.getId(), user.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user, user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration)
                .userId(user.getId())
                .tenantId(tenant.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = (User) authentication.getPrincipal();
        
        // Update last login time
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("User logged in: {} from tenant: {}", user.getEmail(), user.getTenantId());

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user, user.getTenantId(), user.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user, user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration)
                .userId(user.getId())
                .tenantId(user.getTenantId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            String refreshToken = request.getRefreshToken();
            String userEmail = jwtTokenProvider.extractUsername(refreshToken);

            User user = userRepository.findByEmailAndArchivedFalse(userEmail)
                    .orElseThrow(() -> new UnauthorizedException("User not found"));

            if (!jwtTokenProvider.isRefreshToken(refreshToken)) {
                throw new UnauthorizedException("Invalid refresh token");
            }

            if (!jwtTokenProvider.isTokenValid(refreshToken, user)) {
                throw new UnauthorizedException("Invalid refresh token");
            }

            // Generate new access token
            String accessToken = jwtTokenProvider.generateAccessToken(user, user.getTenantId(), user.getId());
            
            log.info("Token refreshed for user: {}", user.getEmail());

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(accessTokenExpiration)
                    .userId(user.getId())
                    .tenantId(user.getTenantId())
                    .email(user.getEmail())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .role(user.getRole().name())
                    .build();
        } catch (Exception e) {
            log.error("Error refreshing token: {}", e.getMessage());
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    private Integer getRateLimitForTier(TenantTier tier) {
        return switch (tier) {
            case FREE -> 100;
            case PRO -> 1000;
            case ENTERPRISE -> 10000;
        };
    }
}
