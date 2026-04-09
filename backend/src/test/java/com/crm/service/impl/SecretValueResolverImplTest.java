package com.crm.service.impl;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SecretValueResolverImplTest {

    private final SecretValueResolverImpl resolver = new SecretValueResolverImpl();

    @Test
    void resolvesPlainValuesWithoutModification() {
        assertEquals("plain-secret", resolver.resolve("plain-secret"));
    }

    @Test
    void resolvesFileBackedSecrets() throws Exception {
        Path secretFile = Files.createTempFile("crm-secret", ".txt");
        Files.writeString(secretFile, "file-secret\n");

        assertEquals("file-secret", resolver.resolve("file:" + secretFile));
    }

    @Test
    void resolvesSystemPropertyBackedSecretsThroughEnvPrefix() {
        System.setProperty("CRM_TEST_SECRET", "property-secret");
        try {
            assertEquals("property-secret", resolver.resolve("env:CRM_TEST_SECRET"));
        } finally {
            System.clearProperty("CRM_TEST_SECRET");
        }
    }

    @Test
    void resolvesBase64Secrets() {
        String encoded = Base64.getEncoder().encodeToString("encoded-secret".getBytes());
        assertEquals("encoded-secret", resolver.resolve("base64:" + encoded));
    }
}
