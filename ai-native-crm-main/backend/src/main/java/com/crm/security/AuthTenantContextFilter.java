package com.crm.security;

import com.crm.config.TenantContext;
import com.crm.repository.TenantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthTenantContextFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final TenantRepository tenantRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);
        boolean tenantContextSet = false;

        try {
            if (isLoginRequest(request)) {
                tenantContextSet = applyTenantFromWorkspaceSlug(wrappedRequest);
            } else if (isRefreshRequest(request)) {
                tenantContextSet = applyTenantFromRefreshToken(wrappedRequest);
            }

            filterChain.doFilter(wrappedRequest, response);
        } finally {
            if (tenantContextSet) {
                TenantContext.clear();
            }
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !isLoginRequest(request) && !isRefreshRequest(request);
    }

    private boolean isLoginRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
                && "/api/v1/auth/login".equals(request.getServletPath());
    }

    private boolean isRefreshRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
                && "/api/v1/auth/refresh".equals(request.getServletPath());
    }

    private boolean applyTenantFromWorkspaceSlug(CachedBodyHttpServletRequest request) {
        String workspaceSlug = readJsonField(request, "workspaceSlug");
        if (workspaceSlug == null || workspaceSlug.isBlank()) {
            return false;
        }

        return tenantRepository.findBySlugAndArchivedFalse(workspaceSlug.trim().toLowerCase())
                .map(tenant -> {
                    TenantContext.setTenantId(tenant.getId());
                    return true;
                })
                .orElse(false);
    }

    private boolean applyTenantFromRefreshToken(CachedBodyHttpServletRequest request) {
        String refreshToken = readJsonField(request, "refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return false;
        }

        try {
            UUID tenantId = jwtTokenProvider.extractTenantId(refreshToken);
            if (tenantId == null) {
                return false;
            }
            TenantContext.setTenantId(tenantId);
            return true;
        } catch (Exception ex) {
            log.debug("Unable to extract tenant from refresh token: {}", ex.getMessage());
            return false;
        }
    }

    private String readJsonField(CachedBodyHttpServletRequest request, String fieldName) {
        try {
            byte[] body = request.getInputStream().readAllBytes();
            if (body.length == 0) {
                return null;
            }
            JsonNode root = objectMapper.readTree(new String(body, StandardCharsets.UTF_8));
            JsonNode field = root.get(fieldName);
            return field != null && !field.isNull() ? field.asText() : null;
        } catch (Exception ex) {
            log.debug("Unable to read auth request body for {}: {}", fieldName, ex.getMessage());
            return null;
        }
    }
}
