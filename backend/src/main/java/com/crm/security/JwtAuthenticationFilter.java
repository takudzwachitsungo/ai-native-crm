package com.crm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.crm.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.crm.config.TenantContext;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JWT Authentication Filter that extracts and validates JWT tokens
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final UserSessionRepository userSessionRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7);
            final String userEmail = jwtTokenProvider.extractUsername(jwt);
            final UUID tenantId = jwtTokenProvider.extractTenantId(jwt);
            final UUID userId = jwtTokenProvider.extractUserId(jwt);
            final UUID sessionId = jwtTokenProvider.extractSessionId(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (tenantId != null) {
                    TenantContext.setTenantId(tenantId);
                }
                UserDetails userDetails = tenantId != null
                        ? userDetailsService.loadUserByUsernameAndTenantId(userEmail, tenantId)
                        : userDetailsService.loadUserByUsername(userEmail);

                if (jwtTokenProvider.isTokenValid(jwt, userDetails)) {
                    if (tenantId != null && userId != null && sessionId != null) {
                        var session = userSessionRepository.findByTenantIdAndUserIdAndIdAndArchivedFalse(tenantId, userId, sessionId)
                                .orElse(null);
                        if (session == null || session.getRevokedAt() != null || session.getExpiresAt().isBefore(LocalDateTime.now())) {
                            filterChain.doFilter(request, response);
                            return;
                        }
                        session.setLastUsedAt(LocalDateTime.now());
                        userSessionRepository.save(session);
                    }
                    // Set authentication
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    log.debug("User {} authenticated for tenant {}", userEmail, tenantId);
                }
            }
        } catch (Exception e) {
            TenantContext.clear();
            log.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/v1/auth/") || 
               path.startsWith("/actuator/") ||
               path.startsWith("/swagger-ui/") ||
               path.startsWith("/v3/api-docs/");
    }
}
