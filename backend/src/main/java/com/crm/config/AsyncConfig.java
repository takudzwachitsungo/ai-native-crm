package com.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;
import java.util.concurrent.Executor;

/**
 * Enable async processing and scheduled tasks
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    @Bean
    public TaskDecorator tenantAwareTaskDecorator() {
        return runnable -> {
            UUID tenantId = TenantContext.getTenantId();
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            return () -> {
                UUID previousTenantId = TenantContext.getTenantId();
                SecurityContext previousSecurityContext = SecurityContextHolder.getContext();
                SecurityContext asyncSecurityContext = SecurityContextHolder.createEmptyContext();
                asyncSecurityContext.setAuthentication(authentication);

                try {
                    if (tenantId != null) {
                        TenantContext.setTenantId(tenantId);
                    } else {
                        TenantContext.clear();
                    }
                    SecurityContextHolder.setContext(asyncSecurityContext);
                    runnable.run();
                } finally {
                    if (previousTenantId != null) {
                        TenantContext.setTenantId(previousTenantId);
                    } else {
                        TenantContext.clear();
                    }
                    SecurityContextHolder.setContext(previousSecurityContext);
                }
            };
        };
    }

    @Bean(name = "taskExecutor")
    public Executor taskExecutor(TaskDecorator tenantAwareTaskDecorator) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("crm-async-");
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(12);
        executor.setQueueCapacity(250);
        executor.setTaskDecorator(tenantAwareTaskDecorator);
        executor.initialize();
        return executor;
    }
}
