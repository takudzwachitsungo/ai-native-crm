package com.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Main Spring Boot Application for AI-Powered CRM Backend
 * 
 * Features:
 * - Multi-tenant architecture with tenant isolation
 * - JWT-based authentication and authorization
 * - AI/RAG capabilities with OpenAI and pgvector
 * - Redis caching for performance
 * - RabbitMQ for async processing
 * - Comprehensive observability with OpenTelemetry and Prometheus
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableTransactionManagement
public class CrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrmApplication.class, args);
    }
}
