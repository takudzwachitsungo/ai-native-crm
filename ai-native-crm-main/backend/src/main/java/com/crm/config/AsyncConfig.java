package com.crm.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enable async processing and scheduled tasks
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
