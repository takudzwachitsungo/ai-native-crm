package com.crm.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.sql.PreparedStatement;
import java.util.UUID;

/**
 * Interceptor to enable Hibernate tenant filter for each request
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TenantFilter implements HandlerInterceptor {

    private final EntityManager entityManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (shouldSkipTenantSessionBinding(request)) {
            return true;
        }

        UUID tenantId = TenantContext.getTenantId();
        
        if (tenantId != null) {
            Session session = entityManager.unwrap(Session.class);
            Filter filter = session.enableFilter("tenantFilter");
            filter.setParameter("tenantId", tenantId);
            bindPostgresTenantSetting(session, tenantId);
            log.debug("Enabled tenant filter for tenant: {}", tenantId);
        }
        
        return true;
    }

    private boolean shouldSkipTenantSessionBinding(HttpServletRequest request) {
        String path = request.getServletPath();
        return "/api/v1/realtime/stream".equals(path);
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        clearPostgresTenantSetting();
        TenantContext.clear();
    }

    private void bindPostgresTenantSetting(Session session, UUID tenantId) {
        try {
            session.doWork(connection -> {
                try (PreparedStatement statement = connection.prepareStatement(
                        "select set_config('app.current_tenant_id', ?, false)"
                )) {
                    statement.setString(1, tenantId.toString());
                    statement.execute();
                }
            });
        } catch (Exception ex) {
            log.warn("Unable to bind Postgres tenant setting for tenant {}", tenantId, ex);
        }
    }

    private void clearPostgresTenantSetting() {
        try {
            Session session = entityManager.unwrap(Session.class);
            session.doWork(connection -> {
                try (PreparedStatement statement = connection.prepareStatement(
                        "select set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000000000', false)"
                )) {
                    statement.execute();
                }
            });
        } catch (Exception ex) {
            log.debug("Unable to clear Postgres tenant setting after request: {}", ex.getMessage());
        }
    }
}
