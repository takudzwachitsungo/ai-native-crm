package com.crm.config;

import io.micrometer.core.instrument.config.MeterFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.regex.Pattern;

@Configuration
public class MetricsConfig {

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "(?i)\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b"
    );

    @Bean
    MeterFilter normalizeHttpServerUriTags() {
        return MeterFilter.replaceTagValues("uri", MetricsConfig::normalizeUriTag, "http.server.requests");
    }

    @Bean
    MeterFilter normalizeHttpClientUriTags() {
        return MeterFilter.replaceTagValues("uri", MetricsConfig::normalizeUriTag, "http.client.requests");
    }

    private static String normalizeUriTag(String uri) {
        if (uri == null || uri.isBlank()) {
            return uri;
        }
        return UUID_PATTERN.matcher(uri).replaceAll("{id}");
    }
}
