package com.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.crm.entity.User;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA Auditing configuration to automatically populate createdBy and updatedBy fields
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class JpaConfig {

    @Bean
    public AuditorAware<UUID> auditorProvider() {
        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !authentication.isAuthenticated() || 
                authentication.getPrincipal().equals("anonymousUser")) {
                return Optional.empty();
            }
            
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                return Optional.of(((User) principal).getId());
            }
            
            return Optional.empty();
        };
    }
}
