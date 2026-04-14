package com.crm.service.impl;

import com.crm.exception.BadRequestException;
import com.crm.service.SecretValueResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

@Service
public class SecretValueResolverImpl implements SecretValueResolver {

    private static final String ENV_PREFIX = "env:";
    private static final String FILE_PREFIX = "file:";
    private static final String BASE64_PREFIX = "base64:";

    @Override
    public String resolve(String rawValue) {
        if (rawValue == null) {
            return null;
        }

        String normalized = rawValue.trim();
        if (normalized.isEmpty()) {
            return normalized;
        }

        if (normalized.startsWith(ENV_PREFIX)) {
            return resolveEnvironmentSecret(normalized.substring(ENV_PREFIX.length()).trim());
        }
        if (normalized.startsWith(FILE_PREFIX)) {
            return resolveFileSecret(normalized.substring(FILE_PREFIX.length()).trim());
        }
        if (normalized.startsWith(BASE64_PREFIX)) {
            return new String(Base64.getDecoder().decode(normalized.substring(BASE64_PREFIX.length()).trim()));
        }

        return rawValue;
    }

    private String resolveEnvironmentSecret(String key) {
        if (key.isBlank()) {
            throw new BadRequestException("Environment-backed secret reference must include a variable name");
        }
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = System.getProperty(key);
        }
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Secret environment variable is not configured: " + key);
        }
        return value;
    }

    private String resolveFileSecret(String filePath) {
        if (filePath.isBlank()) {
            throw new BadRequestException("File-backed secret reference must include a path");
        }
        try {
            return Files.readString(Path.of(filePath)).trim();
        } catch (IOException ex) {
            throw new BadRequestException("Could not read secret file: " + filePath);
        }
    }
}
